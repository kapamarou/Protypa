import GradingSheet from "../[id]/GradingSheet";
import type { Simulation, Student } from "@/lib/types";
import Link from "next/link";

const MOCK_SIM: Simulation = {
  id: "preview",
  number: 2,
  title: "Διαγώνισμα 2 · Δεκέμβριος 2024",
  subject: "bundle",
  exam_date: "2024-12-14",
  unlocks_at: "2024-12-14T09:00:00Z",
  grading_closes_at: "2025-01-20T23:59:00Z",
  greek_questions: 20,
  math_questions: 20,
  is_published: true,
  material_url: null,
  questions_url: null,
  greek_questions_url: null,
  math_questions_url: null,
  greek_answers_url: null,
  math_answers_url: null,
  created_at: "2024-10-01T00:00:00Z",
};

const MOCK_STUDENTS: Student[] = [
  { id: "s1", school_id: "preview", first_name: "Μαρία",    last_name: "Παπαδοπούλου", class_year: "Δημοτικό", subjects: ["greek","math"], notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
  { id: "s2", school_id: "preview", first_name: "Γιώργης",  last_name: "Αλεξίου",      class_year: "Δημοτικό", subjects: ["math"],         notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
  { id: "s3", school_id: "preview", first_name: "Ελένη",    last_name: "Βασιλείου",    class_year: "Δημοτικό", subjects: ["greek","math"], notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
  { id: "s4", school_id: "preview", first_name: "Νίκος",    last_name: "Δημητρίου",    class_year: "Γυμνάσιο", subjects: ["greek"],        notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
  { id: "s5", school_id: "preview", first_name: "Σοφία",    last_name: "Κωνσταντίνου", class_year: "Γυμνάσιο", subjects: ["greek","math"], notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
  { id: "s6", school_id: "preview", first_name: "Θάνος",    last_name: "Οικονόμου",    class_year: "Γυμνάσιο", subjects: ["math"],         notes: null, mother_name: null, father_name: null, gender: null, created_at: "", updated_at: "" },
];

// Pre-seed some realistic wrong answers so the sheet isn't blank
const MOCK_GRADES = [
  { id: "g1", student_id: "s1", simulation_id: "preview", school_simulation_id: "preview-ss", wrong_questions: [3,7,12,18,22,27,35], score: 83, submitted_at: "", updated_at: "" },
  { id: "g2", student_id: "s3", simulation_id: "preview", school_simulation_id: "preview-ss", wrong_questions: [1,5,9,14,20,24,30,33,38], score: 78, submitted_at: "", updated_at: "" },
];

export default function GradingPreviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/account/grading" className="text-xs text-ink/40 hover:text-ink/60 transition-colors mt-1">← Πίσω</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase text-ink/40">Βαθμολόγηση</div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">ΠΡΟΕΠΙΣΚΟΠΗΣΗ</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl text-ink">{MOCK_SIM.title}</h1>
          <div className="flex flex-wrap gap-4 mt-1 text-xs text-ink/40">
            <span>40 ερωτήσεις (20 Γλώσσα + 20 Μαθ/κά)</span>
            <span>Εξέταση: 14/12/2024</span>
            <span>Καταχώρηση έως: 20 Ιαν</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
        <strong>Προεπισκόπηση:</strong> Αυτά είναι δείγματα δεδομένων. Οι αλλαγές δεν αποθηκεύονται. Συνδεθείτε για πραγματική βαθμολόγηση.
      </div>

      <GradingSheet
        simulation={MOCK_SIM}
        participation={{ id: "preview-ss", school_id: "preview", simulation_id: "preview", student_count: 6, is_submitted: false, submitted_at: null }}
        students={MOCK_STUDENTS}
        existingGrades={MOCK_GRADES}
        tags={[]}
        schoolSimulationId="preview-ss"
        userId="preview"
      />
    </div>
  );
}
