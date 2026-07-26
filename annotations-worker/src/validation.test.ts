import { describe, expect, it } from "vitest";
import { parseAnnotationInput, validateSlug } from "./validation";

const valid = {
  id: "annotation-123456",
  selector: { exact: "Trust is accumulated evidence." },
  text: "This is the note.",
  tags: ["trust"],
  visibility: "private",
};

describe("annotation validation", () => {
  it("accepts a bounded annotation", () => {
    expect(parseAnnotationInput(valid)).toEqual(valid);
  });

  it("rejects unsafe slugs and malformed annotations", () => {
    expect(validateSlug("../secret")).toBe(false);
    expect(parseAnnotationInput({ ...valid, text: "" })).toBeNull();
    expect(parseAnnotationInput({ ...valid, visibility: "reader" })).toBeNull();
    expect(parseAnnotationInput({ ...valid, tags: ["Bad Tag"] })).toBeNull();
  });
});
