import fs from "node:fs";
import path from "node:path";
import type { PublicAnnotationFile } from "../../types/annotations";
import { isPublicAnnotationFile } from "../annotations";

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

interface VFileLike {
  path?: string;
  history?: string[];
}

interface AnnotationLogger {
  warn: (message: string) => void;
}

interface TextNodeLocation {
  node: HastNode;
  parent: HastNode;
  start: number;
  end: number;
}

interface AnnotationMatch {
  id: string;
  number: number;
  start: number;
  end: number;
}

const BLOCK_TAGS = new Set(["p", "li", "blockquote", "h2", "h3", "h4"]);
const SKIPPED_TAGS = new Set(["a", "code", "pre", "script", "style", "sup"]);
const ANNOTATIONS_PATH = path.join(process.cwd(), "src", "data", "annotations");

const readAnnotations = (entryId: string): PublicAnnotationFile | null => {
  const annotationPath = path.join(ANNOTATIONS_PATH, `${entryId}.json`);
  if (!fs.existsSync(annotationPath)) return null;

  try {
    const data: unknown = JSON.parse(fs.readFileSync(annotationPath, "utf8"));
    if (!isPublicAnnotationFile(data)) {
      console.warn(`[annotations] Invalid annotation data: ${annotationPath}`);
      return null;
    }
    return data;
  } catch (error) {
    console.warn(`[annotations] Could not parse ${annotationPath}`, error);
    return null;
  }
};

const visitBlocks = (node: HastNode, blocks: HastNode[]) => {
  if (node.type === "element" && node.tagName && BLOCK_TAGS.has(node.tagName)) {
    blocks.push(node);
    return;
  }

  node.children?.forEach(child => visitBlocks(child, blocks));
};

const collectTextNodes = (
  node: HastNode,
  parent: HastNode,
  locations: TextNodeLocation[],
  cursor: { value: number },
  skipped = false
) => {
  const shouldSkip =
    skipped ||
    (node.type === "element" &&
      !!node.tagName &&
      SKIPPED_TAGS.has(node.tagName));

  if (node.type === "text" && typeof node.value === "string" && !shouldSkip) {
    const start = cursor.value;
    cursor.value += node.value.length;
    locations.push({ node, parent, start, end: cursor.value });
    return;
  }

  if (shouldSkip && !skipped) {
    cursor.value += 1;
    return;
  }

  node.children?.forEach(child =>
    collectTextNodes(child, node, locations, cursor, shouldSkip)
  );
};

const findOccurrences = (text: string, exact: string) => {
  const occurrences: number[] = [];
  let start = 0;

  while (start <= text.length - exact.length) {
    const match = text.indexOf(exact, start);
    if (match === -1) break;
    occurrences.push(match);
    start = match + Math.max(1, exact.length);
  }

  return occurrences;
};

const getSearchableText = (locations: TextNodeLocation[]) => {
  let text = "";
  for (const location of locations) {
    if (location.start > text.length) {
      text += "\0".repeat(location.start - text.length);
    }
    text += location.node.value ?? "";
  }
  return text;
};

const matchesContext = (
  text: string,
  start: number,
  exact: string,
  prefix?: string,
  suffix?: string
) => {
  if (prefix && !text.slice(0, start).endsWith(prefix)) return false;
  if (suffix && !text.slice(start + exact.length).startsWith(suffix)) {
    return false;
  }
  return true;
};

const createAnchor = (
  id: string,
  value: string,
  isFirstPart: boolean
): HastNode => ({
  type: "element",
  tagName: "mark",
  properties: {
    className: ["annotation-anchor"],
    ...(isFirstPart ? { id: `annotation-anchor-${id}` } : {}),
    "data-annotation-id": id,
  },
  children: [{ type: "text", value }],
});

const createReference = (id: string, number: number): HastNode => ({
  type: "element",
  tagName: "sup",
  properties: { className: ["annotation-ref"] },
  children: [
    {
      type: "element",
      tagName: "a",
      properties: {
        href: `#annotation-note-${id}`,
        "aria-label": `Read annotation ${number}`,
      },
      children: [{ type: "text", value: String(number) }],
    },
  ],
});

const applyMatches = (
  locations: TextNodeLocation[],
  matches: AnnotationMatch[]
) => {
  for (const location of locations) {
    const overlapping = matches
      .filter(match => match.start < location.end && match.end > location.start)
      .sort((a, b) => a.start - b.start);

    if (!overlapping.length || !location.parent.children) continue;

    const replacement: HastNode[] = [];
    const value = location.node.value ?? "";
    let cursor = 0;

    for (const match of overlapping) {
      const localStart = Math.max(0, match.start - location.start);
      const localEnd = Math.min(value.length, match.end - location.start);

      if (localStart > cursor) {
        replacement.push({
          type: "text",
          value: value.slice(cursor, localStart),
        });
      }

      replacement.push(
        createAnchor(
          match.id,
          value.slice(localStart, localEnd),
          match.start >= location.start
        )
      );

      if (match.end <= location.end) {
        replacement.push(createReference(match.id, match.number));
      }

      cursor = localEnd;
    }

    if (cursor < value.length) {
      replacement.push({ type: "text", value: value.slice(cursor) });
    }

    const index = location.parent.children.indexOf(location.node);
    if (index !== -1) {
      location.parent.children.splice(index, 1, ...replacement);
    }
  }
};

export const applyPublicAnnotations = (
  tree: HastNode,
  data: PublicAnnotationFile,
  entryId: string,
  logger: AnnotationLogger = console
) => {
  if (!data.annotations.length) return;

  const blocks: HastNode[] = [];
  visitBlocks(tree, blocks);
  const matchesByBlock = new Map<
    HastNode,
    { locations: TextNodeLocation[]; matches: AnnotationMatch[] }
  >();
  const occupied = new Map<HastNode, Array<{ start: number; end: number }>>();

  data.annotations.forEach((annotation, index) => {
    const candidates: Array<{
      block: HastNode;
      locations: TextNodeLocation[];
      start: number;
    }> = [];

    for (const block of blocks) {
      const locations: TextNodeLocation[] = [];
      collectTextNodes(block, block, locations, { value: 0 });
      const text = getSearchableText(locations);

      findOccurrences(text, annotation.selector.exact)
        .filter(start =>
          matchesContext(
            text,
            start,
            annotation.selector.exact,
            annotation.selector.prefix,
            annotation.selector.suffix
          )
        )
        .forEach(start => candidates.push({ block, locations, start }));
    }

    if (candidates.length !== 1) {
      logger.warn(
        `[annotations] ${entryId}:${annotation.id} matched ${candidates.length} passages`
      );
      return;
    }

    const candidate = candidates[0];
    const end = candidate.start + annotation.selector.exact.length;
    const ranges = occupied.get(candidate.block) ?? [];
    if (
      ranges.some(range => candidate.start < range.end && end > range.start)
    ) {
      logger.warn(
        `[annotations] ${entryId}:${annotation.id} overlaps another annotation`
      );
      return;
    }

    ranges.push({ start: candidate.start, end });
    occupied.set(candidate.block, ranges);

    const blockMatches = matchesByBlock.get(candidate.block) ?? {
      locations: candidate.locations,
      matches: [],
    };
    blockMatches.matches.push({
      id: annotation.id,
      number: index + 1,
      start: candidate.start,
      end,
    });
    matchesByBlock.set(candidate.block, blockMatches);
  });

  matchesByBlock.forEach(({ locations, matches }) =>
    applyMatches(locations, matches)
  );
};

export const rehypeAnnotations = (options?: { entryId?: string }) => {
  return (tree: HastNode, file: VFileLike) => {
    const filePath = file.path ?? file.history?.[0];
    const entryId =
      options?.entryId ??
      (filePath ? path.basename(filePath, path.extname(filePath)) : undefined);
    if (!entryId) return;

    const data = readAnnotations(entryId);
    if (!data) return;

    applyPublicAnnotations(tree, data, entryId);
  };
};
