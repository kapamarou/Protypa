import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

// ─── Constants ───────────────────────────────────────────────────────────────
// Every Προσομοίωση has 20 Γλώσσα questions (1-20) followed by 20 Μαθηματικά
// (21-40). The 20+20 layout is shared between our previous "question
// number" template and the boss's "ΚΡΙΤΗΡΙΟ N" workbook.
const GREEK_QUESTIONS = 20;
const MATH_QUESTIONS = 20;
const TOTAL_QUESTIONS = GREEK_QUESTIONS + MATH_QUESTIONS;

// Accept either the original lowercase or the boss's all-caps header.
const HEADER_ALIASES = {
  question: ["Ερώτηση", "ΕΡΩΤΗΣΗ"],
  category: ["Κατηγορία", "ΧΑΡΑΚΤΗΡΙΣΜΟΣ"],
  answer:   ["Απάντηση", "ΑΠΑΝΤΗΣΗ"],
  difficulty: ["Δυσκολία", "ΔΥΣΚΟΛΙΑ"],
} as const;

type Subject = "greek" | "math";
type TagRow = {
  simulation_id: string;
  question_number: number;
  subject: Subject;
  category: string;
  correct_answer: string | null;
  difficulty: number | null;
};
type SheetReport = {
  sheet: string;
  status: "ok" | "warning" | "skipped";
  message: string;
  count: number;
};

// Pull a digit from a sheet name. Accepts plain numbers ("1", "10")
// and labelled forms like "ΚΡΙΤΗΡΙΟ 1", "Διαγώνισμα 02", "Sim 3 - draft".
function extractSheetNumber(sheetName: string): number | null {
  const match = sheetName.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// The boss's workbook puts a title row above the header. Find the row that
// actually contains the column headers and treat everything below it as data.
// Returns { header: string[], data: unknown[][] }.
function splitHeaderAndData(sheet: XLSX.WorkSheet): {
  header: string[];
  data: unknown[][];
} {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    defval: "",
    header: 1,
  });

  const wantedHeaders = new Set<string>([
    ...HEADER_ALIASES.question,
    ...HEADER_ALIASES.category,
    ...HEADER_ALIASES.answer,
    ...HEADER_ALIASES.difficulty,
  ]);

  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const row = matrix[i].map((c) => String(c ?? "").trim());
    const hits = row.filter((c) => wantedHeaders.has(c)).length;
    if (hits >= 2) {
      return { header: row, data: matrix.slice(i + 1) };
    }
  }
  // No recognisable header — return everything as data with empty header so
  // the caller can choose to skip.
  return { header: [], data: matrix };
}

// Find which column index holds each field. Returns -1 if not present.
function locateColumns(header: string[]) {
  function find(aliases: readonly string[]): number {
    for (let i = 0; i < header.length; i++) {
      if (aliases.includes(header[i])) return i;
    }
    return -1;
  }
  return {
    question:   find(HEADER_ALIASES.question),
    category:   find(HEADER_ALIASES.category),
    answer:     find(HEADER_ALIASES.answer),
    difficulty: find(HEADER_ALIASES.difficulty),
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
// POST /api/admin/question-tags
//   multipart/form-data with `file=<xlsx>`
// Parses each sheet, validates, and bulk-upserts into simulation_question_tags.
// Sheets are matched to simulations by extracting a number from the sheet
// name (so "ΚΡΙΤΗΡΙΟ 1" maps to simulations.number === 1, etc.).
export async function POST(req: Request) {
  try {
    return await handlePost(req);
  } catch (err) {
    console.error("question-tags upload error:", err);
    return NextResponse.json({ error: "Σφάλμα διακομιστή. Δοκιμάστε ξανά." }, { status: 500 });
  }
}

async function handlePost(req: Request) {
  // 1. Auth gate — must be an admin profile.
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 2. Check service role key before we need it.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set in production environment." }, { status: 503 });
  }

  // 3. Read the uploaded file.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Δεν ήταν δυνατή η ανάγνωση του αρχείου." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Δεν επιλέχθηκε αρχείο." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "Παρακαλούμε ανεβάστε αρχείο .xlsx." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    return NextResponse.json({ error: "Το αρχείο δεν αναγνωρίστηκε ως έγκυρο Excel. Βεβαιωθείτε ότι είναι αρχείο .xlsx." }, { status: 400 });
  }

  // 4. Build a number → simulation lookup so we can match sheets.
  const admin = createSupabaseServiceClient();
  const { data: sims, error: simsErr } = await admin
    .from("simulations")
    .select("id, number, title");
  if (simsErr) {
    console.error("Failed to load simulations:", simsErr.message);
    return NextResponse.json({ error: "Σφάλμα διακομιστή. Δοκιμάστε ξανά." }, { status: 500 });
  }
  const simByNumber = new Map<number, { id: string; title: string }>();
  for (const s of sims ?? []) {
    simByNumber.set(s.number, { id: s.id, title: s.title });
  }

  // 4. Walk every sheet, parse, collect tag rows.
  const tagsToUpsert: TagRow[] = [];
  const sheetReports: SheetReport[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetNumber = extractSheetNumber(sheetName);
    if (sheetNumber === null) {
      sheetReports.push({
        sheet: sheetName,
        status: "skipped",
        message: "Το όνομα του φύλλου δεν περιέχει αριθμό — παραλείπεται.",
        count: 0,
      });
      continue;
    }
    const sim = simByNumber.get(sheetNumber);
    if (!sim) {
      sheetReports.push({
        sheet: sheetName,
        status: "skipped",
        message: `Δεν υπάρχει διαγώνισμα με αριθμό ${sheetNumber}.`,
        count: 0,
      });
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const { header, data } = splitHeaderAndData(sheet);
    const cols = locateColumns(header);

    if (cols.question < 0 || cols.category < 0) {
      sheetReports.push({
        sheet: sheetName,
        status: "skipped",
        message:
          "Δεν εντοπίστηκαν οι απαιτούμενες στήλες ('Ερώτηση' και 'Κατηγορία' ή 'ΧΑΡΑΚΤΗΡΙΣΜΟΣ').",
        count: 0,
      });
      continue;
    }

    const seen = new Set<number>();
    let validCount = 0;
    for (const row of data) {
      const qRaw = row[cols.question];
      const catRaw = row[cols.category];
      const ansRaw = cols.answer >= 0 ? row[cols.answer] : "";
      const diffRaw = cols.difficulty >= 0 ? row[cols.difficulty] : "";

      const q = Number(qRaw);
      const category = String(catRaw ?? "").trim();
      const correct_answer = String(ansRaw ?? "").trim().toUpperCase() || null;
      const diffNum = Number(diffRaw);
      const difficulty =
        Number.isInteger(diffNum) && diffNum >= 1 && diffNum <= 3 ? diffNum : null;

      if (
        !Number.isInteger(q) ||
        q < 1 ||
        q > TOTAL_QUESTIONS ||
        seen.has(q) ||
        !category
      ) {
        continue;
      }
      seen.add(q);
      const subject: Subject = q <= GREEK_QUESTIONS ? "greek" : "math";
      tagsToUpsert.push({
        simulation_id: sim.id,
        question_number: q,
        subject,
        category,
        correct_answer,
        difficulty,
      });
      validCount++;
    }

    sheetReports.push({
      sheet: sheetName,
      status: validCount === 0
        ? "skipped"
        : validCount === TOTAL_QUESTIONS
          ? "ok"
          : "warning",
      message:
        validCount === 0
          ? `${sim.title} — δεν βρέθηκαν συμπληρωμένες ερωτήσεις στο φύλλο.`
          : validCount === TOTAL_QUESTIONS
            ? `${sim.title} — ${validCount} ερωτήσεις κατηγοριοποιήθηκαν.`
            : `${sim.title} — βρέθηκαν ${validCount} έγκυρες ερωτήσεις (αναμένονταν ${TOTAL_QUESTIONS}).`,
      count: validCount,
    });
  }

  if (tagsToUpsert.length === 0) {
    return NextResponse.json(
      {
        error:
          "Δεν βρέθηκαν έγκυρες κατηγοριοποιήσεις. Ελέγξτε τα ονόματα φύλλων (πρέπει να περιέχουν αριθμό) και τις στήλες (Ερώτηση/ΕΡΩΤΗΣΗ + Κατηγορία/ΧΑΡΑΚΤΗΡΙΣΜΟΣ).",
        sheets: sheetReports,
      },
      { status: 400 },
    );
  }

  // 5. Bulk upsert. The unique (simulation_id, question_number) constraint
  // means re-uploads update the same row instead of duplicating it.
  const { error: upsertErr } = await admin
    .from("simulation_question_tags")
    .upsert(tagsToUpsert, { onConflict: "simulation_id,question_number" });
  if (upsertErr) {
    console.error("Failed to upsert question tags:", upsertErr.message);
    return NextResponse.json(
      { error: "Σφάλμα κατά την αποθήκευση. Δοκιμάστε ξανά.", sheets: sheetReports },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    updated: tagsToUpsert.length,
    sheets: sheetReports,
  });
}
