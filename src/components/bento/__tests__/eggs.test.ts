import { describe, expect, it } from "vitest";
import { matchSequence, KONAMI, SEKIRO } from "../eggs";

describe("matchSequence", () => {
  it("matches when the buffer ends with the sequence", () => {
    expect(matchSequence(["x", ...SEKIRO], SEKIRO)).toBe(true);
  });
  it("rejects partial or interrupted sequences", () => {
    expect(matchSequence(SEKIRO.slice(0, -1), SEKIRO)).toBe(false);
    expect(matchSequence([...SEKIRO.slice(0, 3), "q", ...SEKIRO], SEKIRO)).toBe(true); // retyping the full word after junk works
    expect(matchSequence(["s", "e", "k", "q", "i", "r", "o"], SEKIRO)).toBe(false); // junk mid-word breaks the suffix
  });
  it("konami is the classic 10 inputs", () => {
    expect(KONAMI).toHaveLength(10);
  });
});
