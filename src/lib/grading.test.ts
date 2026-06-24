import { scoreAnswers } from "./grading";
import type { Question } from "./types";

function q(number: number, qtype: string, correct: string): Question {
  return {
    id: `q${number}`,
    paper_id: "p",
    number,
    qtype,
    prompt_el: null,
    choices: ["A", "B", "C", "D"],
    correct_answer: correct,
  } as unknown as Question;
}

describe("scoreAnswers", () => {
  it("scores an all-correct submission", () => {
    const qs = [q(1, "grammar", "A"), q(2, "grammar", "B")];
    const r = scoreAnswers(qs, { "1": "A", "2": "B" });
    expect(r.score).toBe(2);
    expect(r.total).toBe(2);
    expect(r.type_breakdown.grammar).toEqual({ correct: 2, total: 2 });
  });

  it("scores 0 when every answer is wrong", () => {
    const qs = [q(1, "grammar", "A")];
    expect(scoreAnswers(qs, { "1": "D" }).score).toBe(0);
  });

  it("matches case-insensitively and trims whitespace", () => {
    const qs = [q(1, "grammar", "B")];
    expect(scoreAnswers(qs, { "1": "  b  " }).score).toBe(1);
  });

  it("treats a missing answer as wrong", () => {
    const qs = [q(1, "grammar", "A"), q(2, "grammar", "B")];
    const r = scoreAnswers(qs, { "1": "A" }); // no answer for question 2
    expect(r.score).toBe(1);
    expect(r.total).toBe(2);
  });

  it("breaks results down by question type", () => {
    const qs = [q(1, "grammar", "A"), q(2, "vocab", "B"), q(3, "vocab", "C")];
    const r = scoreAnswers(qs, { "1": "A", "2": "X", "3": "C" });
    expect(r.type_breakdown.grammar).toEqual({ correct: 1, total: 1 });
    expect(r.type_breakdown.vocab).toEqual({ correct: 1, total: 2 });
  });
});
