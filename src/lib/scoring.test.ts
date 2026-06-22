import {
  pointsForQuestion,
  totalPointsInRange,
  computeScore,
  gradeCountsForStats,
} from "./scoring";

describe("pointsForQuestion", () => {
  it("weights Q1-10 at 2 points", () => {
    expect(pointsForQuestion(1)).toBe(2);
    expect(pointsForQuestion(10)).toBe(2);
  });
  it("weights Q11-20 at 3 points", () => {
    expect(pointsForQuestion(11)).toBe(3);
    expect(pointsForQuestion(20)).toBe(3);
  });
  it("weights Q21-30 at 2 points", () => {
    expect(pointsForQuestion(21)).toBe(2);
    expect(pointsForQuestion(30)).toBe(2);
  });
  it("weights Q31-40 at 3 points", () => {
    expect(pointsForQuestion(31)).toBe(3);
    expect(pointsForQuestion(40)).toBe(3);
  });
  it("returns 0 outside 1..40", () => {
    expect(pointsForQuestion(0)).toBe(0);
    expect(pointsForQuestion(41)).toBe(0);
    expect(pointsForQuestion(-3)).toBe(0);
  });
});

describe("totalPointsInRange", () => {
  it("sums the full paper to 100", () => {
    expect(totalPointsInRange(1, 40)).toBe(100);
  });
  it("sums the Greek half (1..20) to 50", () => {
    expect(totalPointsInRange(1, 20)).toBe(50);
  });
  it("sums the Maths half (21..40) to 50", () => {
    expect(totalPointsInRange(21, 40)).toBe(50);
  });
});

describe("computeScore", () => {
  it("returns 100 for a perfect paper", () => {
    expect(computeScore([])).toBe(100);
  });
  it("subtracts a single 2-point question", () => {
    expect(computeScore([1])).toBe(98);
  });
  it("subtracts a single 3-point question", () => {
    expect(computeScore([11])).toBe(97);
  });
  it("scores 0 when everything is wrong", () => {
    const all = Array.from({ length: 40 }, (_, i) => i + 1);
    expect(computeScore(all)).toBe(0);
  });
  it("scopes to a range and ignores out-of-range wrongs", () => {
    // Range 1..20 (max 50). Wrong: 1 (2pts) + 11 (3pts) = 5 lost; 21 is ignored.
    expect(computeScore([1, 11, 21], 1, 20)).toBe(90);
  });
  it("returns 100 when the only wrong is outside the range", () => {
    expect(computeScore([25], 1, 20)).toBe(100);
  });
});

describe("gradeCountsForStats", () => {
  it("counts when there is no deadline", () => {
    expect(gradeCountsForStats("2026-01-01T00:00:00Z", null)).toBe(true);
  });
  it("counts when submitted before the deadline", () => {
    expect(gradeCountsForStats("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z")).toBe(true);
  });
  it("counts exactly at the deadline (<= boundary)", () => {
    expect(gradeCountsForStats("2026-02-01T00:00:00Z", "2026-02-01T00:00:00Z")).toBe(true);
  });
  it("excludes a grade submitted after the deadline", () => {
    expect(gradeCountsForStats("2026-02-01T00:00:01Z", "2026-02-01T00:00:00Z")).toBe(false);
  });
  it("excludes when there is a deadline but no submission time", () => {
    expect(gradeCountsForStats(null, "2026-02-01T00:00:00Z")).toBe(false);
  });
});
