import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { computeScore, gradeCountsForStats } from "@/lib/scoring";
import type { SimulationQuestionTag, Simulation, StudentSimulationGrade, Student } from "@/lib/types";

const TARGET_SCORE = 75;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Verify student belongs to this account
  const { data: studentRow } = await supabase
    .from("students").select("*").eq("id", id).eq("school_id", user.id).maybeSingle();
  if (!studentRow) return NextResponse.json({ error: "not found" }, { status: 404 });
  const student = studentRow as Student;

  // Fetch grades with simulations
  const { data: gradesRaw } = await supabase
    .from("student_simulation_grades")
    .select("*, simulations(*)")
    .eq("student_id", id)
    .order("submitted_at", { ascending: true });
  const grades = (gradesRaw ?? []) as (StudentSimulationGrade & { simulations: Simulation })[];

  const eligibleGrades = grades.filter((g) =>
    gradeCountsForStats(g.submitted_at, g.simulations?.grading_closes_at)
  );

  if (eligibleGrades.length === 0) {
    return NextResponse.json({ error: "Δεν υπάρχουν αρκετά δεδομένα για ανάλυση." }, { status: 400 });
  }

  // Fetch question tags for all simulations
  const simIds = grades.map((g) => g.simulation_id);
  const { data: tagsRaw } = await supabase
    .from("simulation_question_tags").select("*").in("simulation_id", simIds);
  const tags = (tagsRaw ?? []) as SimulationQuestionTag[];

  // Build maps: sim_id → (question_number → {category, difficulty})
  const tagMap = new Map<string, Map<number, { category: string; difficulty: number | null }>>();
  for (const t of tags) {
    if (!tagMap.has(t.simulation_id)) tagMap.set(t.simulation_id, new Map());
    tagMap.get(t.simulation_id)!.set(t.question_number, { category: t.category, difficulty: t.difficulty });
  }

  // Fetch peer grades for rank calculation
  const schoolSimIds = grades.map((g) => g.school_simulation_id);
  const { data: allGradesRaw } = schoolSimIds.length
    ? await supabase.from("student_simulation_grades")
        .select("student_id, simulation_id, score, school_simulation_id")
        .in("school_simulation_id", schoolSimIds)
    : { data: [] };
  const allGrades = (allGradesRaw ?? []) as { student_id: string; simulation_id: string; score: number; school_simulation_id: string }[];

  // ── Compute metrics ───────────────────────────────────────────────────────

  const scores = eligibleGrades.map((g) => g.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const mostRecentScore = scores[scores.length - 1];
  const firstScore = scores[0];
  const trend = mostRecentScore - firstScore;

  // Category stats
  const categoryStats: Record<string, { wrong: number; total: number }> = {};
  // Difficulty stats
  const diffStats: Record<number, { right: number; wrong: number }> = { 1: { right: 0, wrong: 0 }, 2: { right: 0, wrong: 0 }, 3: { right: 0, wrong: 0 } };

  for (const grade of eligibleGrades) {
    const sim = grade.simulations;
    if (!sim) continue;
    const total = sim.greek_questions + sim.math_questions;
    const simTagMap = tagMap.get(grade.simulation_id);
    const wrongSet = new Set(grade.wrong_questions ?? []);

    for (let q = 1; q <= total; q++) {
      const tag = simTagMap?.get(q);
      const cat = tag?.category ?? (q <= sim.greek_questions ? "Ν. Γλώσσα" : "Μαθηματικά");
      const diff = tag?.difficulty;
      const isWrong = wrongSet.has(q);

      if (!categoryStats[cat]) categoryStats[cat] = { wrong: 0, total: 0 };
      categoryStats[cat].total++;
      if (isWrong) categoryStats[cat].wrong++;

      if (diff && diff >= 1 && diff <= 3) {
        if (isWrong) diffStats[diff].wrong++;
        else diffStats[diff].right++;
      }
    }
  }

  const categoryList = Object.entries(categoryStats)
    .map(([cat, { wrong, total }]) => ({ cat, wrong, total, rate: total ? wrong / total : 0 }))
    .sort((a, b) => b.rate - a.rate);

  const weakCategories = categoryList.filter((c) => c.total > 0).slice(0, 5);
  const strongCategories = [...categoryList].reverse().filter((c) => c.total > 0).slice(0, 3);

  const diffPct = (d: number) => {
    const { right, wrong } = diffStats[d];
    const total = right + wrong;
    return total > 0 ? Math.round((right / total) * 100) : null;
  };
  const easyCorrect = diffPct(1);
  const medCorrect = diffPct(2);
  const hardCorrect = diffPct(3);
  // Carelessness = wrong answers on easy questions
  const carelessness = diffStats[1].right + diffStats[1].wrong > 0
    ? Math.round((diffStats[1].wrong / (diffStats[1].right + diffStats[1].wrong)) * 100)
    : null;

  // Peer rank — average across eligible sims
  const rankData: { rank: number; total: number }[] = [];
  for (const grade of eligibleGrades) {
    const peers = allGrades.filter((p) => p.school_simulation_id === grade.school_simulation_id);
    if (peers.length < 2) continue;
    const rank = peers.filter((p) => p.score > grade.score).length + 1;
    rankData.push({ rank, total: peers.length });
  }
  const avgRank = rankData.length
    ? Math.round(rankData.reduce((a, b) => a + b.rank, 0) / rankData.length)
    : null;
  const avgPeers = rankData.length
    ? Math.round(rankData.reduce((a, b) => a + b.total, 0) / rankData.length)
    : null;

  const today = new Date().toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" });
  const subjects = student.subjects.map((s) => s === "greek" ? "Γλώσσα" : "Μαθηματικά").join(" & ");

  // ── Build prompt ──────────────────────────────────────────────────────────

  const prompt = `Είσαι εκπαιδευτικός σύμβουλος που γράφει αναφορές προόδου μαθητών για φροντιστήριο προετοιμασίας για Πρότυπα και Ωνάσεια Σχολεία.

ΤΟΝΟΣ: εκπαιδευτικός, ανθρώπινος, υποστηρικτικός, ενθαρρυντικός. Απευθύνεται σε γονείς.
ΑΠΑΓΟΡΕΥΟΝΤΑΙ οι λέξεις/φράσεις: "αποτυχία", "αδυναμία μαθητή", "χαμηλή νοημοσύνη", "δεν θα τα καταφέρει", "έχει πάρα πολλά εκπαιδευτικά κενά".
ΧΡΗΣΙΜΟΠΟΙΕΙ: "περιοχή ανάπτυξης και ενίσχυσης", "προοπτική βελτίωσης", "μαθησιακή δυναμική", "στοχευμένη παρέμβαση", "σταδιακή πρόοδος".

Ακολούθησε ΑΚΡΙΒΩΣ αυτή τη δομή:

ΑΝΑΦΟΡΑ ΓΟΝΕΑ – ${student.last_name} ${student.first_name}
Ονοματεπώνυμο: ${student.last_name} ${student.first_name}
Ημερομηνία έκδοσης: ${today}
Διαγωνίσματα που αξιολογήθηκαν: ${eligibleGrades.length}

---
Σελίδα 1 – Τι πρέπει να γνωρίζετε σε 30 δευτερόλεπτα

Συνοπτική Εικόνα
[3-4 προτάσεις: γενική εικόνα, σύγκριση με στόχο ${TARGET_SCORE}%, θετικά στοιχεία, τι χρειάζεται ενίσχυση]

Βασικοί Δείκτες
Συνολική Επίδοση: ${avgScore}%
Στόχος: ${TARGET_SCORE}%
Τελευταίο Διαγώνισμα: ${mostRecentScore}%
Πρόοδος από αρχή: ${trend >= 0 ? "+" : ""}${trend} μονάδες${easyCorrect !== null ? `\nΕπίδοση σε Εύκολες Ερωτήσεις: ${easyCorrect}%` : ""}${medCorrect !== null ? `\nΕπίδοση σε Μέτριες Ερωτήσεις: ${medCorrect}%` : ""}${hardCorrect !== null ? `\nΑνθεκτικότητα (Δύσκολες Ερωτήσεις): ${hardCorrect}%` : ""}${carelessness !== null ? `\nΑπροσεξία σε Εύκολες Ερωτήσεις: ${carelessness}%` : ""}${avgRank !== null ? `\nΜέση Θέση στο Τμήμα: ${avgRank}ος/${avgPeers}ος` : ""}

Δυνατά Σημεία
[3-5 γραμμές με ✔, βασισμένες στα δεδομένα — αν σκοράρει καλά σε εύκολες/μέτριες, αν βελτιώνεται, αν έχει κατηγορίες με χαμηλό ποσοστό λαθών]
Κατηγορίες με τα λιγότερα λάθη: ${strongCategories.map((c) => `${c.cat} (${Math.round(c.rate * 100)}% λάθος)`).join(", ")}

Περιοχές που Χρειάζονται Ενίσχυση
[γραμμές με ⚠ για κάθε κατηγορία ανάπτυξης]
Κατηγορίες με τα περισσότερα λάθη: ${weakCategories.map((c) => `${c.cat} (${Math.round(c.rate * 100)}% λάθος)`).join(", ")}

Το βασικό μήνυμα προς τους γονείς
[3-4 προτάσεις ενθαρρυντικές, εστιασμένες στη συνεργασία και την πρόοδο]

---
Σελίδα 2 – Εκπαιδευτική Ανάλυση και Πλάνο Υποστήριξης

Εκπαιδευτική Ανάλυση
[Παράγραφος: ανάλυση μοτίβων λαθών, σχέση δυσκολίας-επίδοσης, τι δείχνουν τα δεδομένα]

Ανάλυση των Βασικών Δυσκολιών
[Για κάθε κατηγορία ενίσχυσης: τίτλος + 2-3 προτάσεις ανάλυσης]

Πλάνο Παρέμβασης του Φροντιστηρίου
[Εισαγωγική πρόταση + 5-6 bullet points με συγκεκριμένες παρεμβάσεις]

Η Ανθρώπινη Διάσταση
[3-4 προτάσεις: πίσω από τα ποσοστά είναι ένα παιδί, ενθαρρυντικές]

Συνολικό Συμπέρασμα
[3-4 προτάσεις: θετικό, με δέσμευση υποστήριξης από το φροντιστήριο]`;

  // ── Call OpenAI ───────────────────────────────────────────────────────────

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OpenAI API key not configured." }, { status: 503 });

  const openai = new OpenAI({ apiKey });

  let summary: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });
    summary = completion.choices[0]?.message?.content ?? "";
    if (!summary) throw new Error("Empty response from OpenAI");
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json({ error: "Αποτυχία δημιουργίας ανάλυσης. Δοκιμάστε ξανά." }, { status: 502 });
  }

  // ── Save to DB ────────────────────────────────────────────────────────────

  const admin = createSupabaseServiceClient();
  const { error: updateErr } = await admin
    .from("students")
    .update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ summary, generated_at: new Date().toISOString() });
}
