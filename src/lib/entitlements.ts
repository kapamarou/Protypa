import { createSupabaseServerClient } from "./supabase/server";
import type { AccountType, ExamPaper, Package, Purchase } from "./types";

// Single source of truth for "does this user have access to X right now?"
// Every protected page and API route MUST go through these helpers — no ad-hoc
// queries — so the rules stay consistent.

export interface ActivePackage {
  purchase: Purchase;
  pkg: Package;
}

export async function getActivePackages(
  userId: string,
): Promise<ActivePackage[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("purchases")
    .select("*, packages(*)")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row: Purchase & { packages: Package }) => ({
    purchase: row,
    pkg: row.packages,
  }));
}

export async function getAccessiblePapers(
  userId: string,
): Promise<(ExamPaper & { package_name: string })[]> {
  const active = await getActivePackages(userId);
  if (active.length === 0) return [];
  const packageIds = active.map((a) => a.pkg.id);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("exam_papers")
    .select("*, packages(name_el)")
    .in("package_id", packageIds)
    .order("year", { ascending: false });

  if (error || !data) return [];
  return data.map(
    (row: ExamPaper & { packages: { name_el: string } }) => ({
      ...row,
      package_name: row.packages.name_el,
    }),
  );
}

export async function hasAccessToPaper(
  userId: string,
  paperId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return false;
  const { data: paper } = await supabase
    .from("exam_papers")
    .select("package_id")
    .eq("id", paperId)
    .single();
  if (!paper) return false;

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("package_id", paper.package_id)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  return !!purchase;
}

// ─── v2: account type + student limits ─────────────────────────────────────
// A user's account_type lives on `profiles`. It controls which package types
// they should be shown and which areas of the app they can see (parents do
// NOT see /account/school).

export async function getAccountType(userId: string): Promise<AccountType> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return "school";
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  return ((data?.account_type as AccountType | undefined) ?? "school");
}

// Returns the total active student limit: highest base package + sum of all expansion add-ons.
// • Parents on the parent package → 1
// • Schools: base tier limit (10/20/30) + sum of expansion max_students
// • No active package → 0 (UI shows "purchase to add students")
export async function getStudentLimit(userId: string): Promise<number> {
  const active = await getActivePackages(userId);
  let base = 0;
  let expansionSum = 0;
  for (const a of active) {
    const m = a.pkg.max_students ?? 0;
    if (a.pkg.package_type === "expansion") {
      expansionSum += m;
    } else if (m > base) {
      base = m;
    }
  }
  return base + expansionSum;
}

// Convenience: are they allowed to add another student right now?
// Returns the current count, the limit, and whether they're at/over capacity.
export async function getStudentCapacity(userId: string): Promise<{
  current: number;
  limit: number;
  canAdd: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { current: 0, limit: 0, canAdd: false };
  const [{ count }, limit] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("school_id", userId),
    getStudentLimit(userId),
  ]);
  const current = count ?? 0;
  return {
    current,
    limit,
    canAdd: limit > 0 && current < limit,
  };
}
