import { describe, expect, it } from "vitest";
import {
  parseAnnotationInput,
  parseAnnotationPatch,
  validateSlug,
} from "./validation";

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

  it("accepts bounded lifecycle changes and rejects empty patches", () => {
    expect(
      parseAnnotationPatch({
        text: "Updated note",
        tags: ["trust", "trust"],
        visibility: "public",
      })
    ).toEqual({
      text: "Updated note",
      tags: ["trust"],
      visibility: "public",
    });
    expect(parseAnnotationPatch({})).toBeNull();
    expect(parseAnnotationPatch({ visibility: "reader" })).toBeNull();
  });
});
