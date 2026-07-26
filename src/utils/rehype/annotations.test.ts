import { describe, expect, it, vi } from "vitest";
import type { PublicAnnotationFile } from "../../types/annotations";
import { applyPublicAnnotations } from "./annotations";

type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const text = (value: string): Node => ({ type: "text", value });
const element = (tagName: string, children: Node[]): Node => ({
  type: "element",
  tagName,
  properties: {},
  children,
});
const tree = (...children: Node[]): Node => ({ type: "root", children });

const data = (
  annotations: PublicAnnotationFile["annotations"]
): PublicAnnotationFile => ({ version: 1, annotations });

const annotation = (
  id: string,
  exact: string,
  selector: { prefix?: string; suffix?: string } = {}
) => ({
  id,
  selector: { exact, ...selector },
  text: `Note for ${id}`,
  createdAt: "2026-07-26",
  visibility: "public" as const,
});

const elements = (node: Node, tagName: string): Node[] => {
  const matches = node.tagName === tagName ? [node] : [];
  return matches.concat(
    ...(node.children?.map(child => elements(child, tagName)) ?? [])
  );
};

describe("applyPublicAnnotations", () => {
  it("anchors one exact passage and adds its reference", () => {
    const root = tree(element("p", [text("Trust is accumulated evidence.")]));

    applyPublicAnnotations(
      root,
      data([annotation("trust", "accumulated")]),
      "note"
    );

    expect(elements(root, "mark")).toMatchObject([
      {
        properties: {
          id: "annotation-anchor-trust",
          "data-annotation-id": "trust",
        },
        children: [{ value: "accumulated" }],
      },
    ]);
    expect(elements(root, "sup")[0].children?.[0].properties).toMatchObject({
      href: "#annotation-note-trust",
    });
  });

  it("uses context to disambiguate repeated text", () => {
    const root = tree(
      element("p", [text("Trust rises here.")]),
      element("p", [text("Evidence means trust rises slowly.")])
    );

    applyPublicAnnotations(
      root,
      data([
        annotation("second", "trust rises", {
          prefix: "Evidence means ",
          suffix: " slowly.",
        }),
      ]),
      "note"
    );

    expect(elements(root, "mark")).toHaveLength(1);
  });

  it("warns and leaves ambiguous passages unchanged", () => {
    const root = tree(
      element("p", [text("same passage")]),
      element("p", [text("same passage")])
    );
    const warn = vi.fn();

    applyPublicAnnotations(root, data([annotation("same", "same")]), "note", {
      warn,
    });

    expect(elements(root, "mark")).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      "[annotations] note:same matched 2 passages"
    );
  });

  it("supports a passage split across inline formatting nodes", () => {
    const root = tree(
      element("p", [
        text("Institutions "),
        element("em", [text("compensate for")]),
        text(" distrust."),
      ])
    );

    applyPublicAnnotations(
      root,
      data([annotation("split", "Institutions compensate for distrust.")]),
      "note"
    );

    expect(elements(root, "mark")).toHaveLength(3);
    expect(elements(root, "sup")).toHaveLength(1);
  });

  it("does not match across links or code", () => {
    const linkRoot = tree(
      element("p", [
        text("one "),
        element("a", [text("ignored")]),
        text(" two"),
      ])
    );
    const codeRoot = tree(
      element("p", [
        text("one "),
        element("code", [text("ignored")]),
        text(" two"),
      ])
    );
    const warn = vi.fn();

    applyPublicAnnotations(
      linkRoot,
      data([annotation("link", "one  two")]),
      "note",
      { warn }
    );
    applyPublicAnnotations(
      codeRoot,
      data([annotation("code", "one  two")]),
      "note",
      { warn }
    );

    expect(elements(linkRoot, "mark")).toHaveLength(0);
    expect(elements(codeRoot, "mark")).toHaveLength(0);
  });

  it("rejects overlapping annotations", () => {
    const root = tree(element("p", [text("abcdef")]));
    const warn = vi.fn();

    applyPublicAnnotations(
      root,
      data([annotation("first", "abcd"), annotation("second", "cdef")]),
      "note",
      { warn }
    );

    expect(elements(root, "mark")).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(
      "[annotations] note:second overlaps another annotation"
    );
  });
});
