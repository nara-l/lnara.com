import fs from "node:fs";
import path from "node:path";
import type {
  PublicAnnotation,
  PublicAnnotationFile,
} from "@/types/annotations";

const ANNOTATIONS_PATH = path.join(process.cwd(), "src", "data", "annotations");

export const isPublicAnnotation = (
  value: unknown
): value is PublicAnnotation => {
  if (!value || typeof value !== "object") return false;

  const annotation = value as Partial<PublicAnnotation>;
  return (
    typeof annotation.id === "string" &&
    /^[a-z0-9][a-z0-9-]*$/.test(annotation.id) &&
    annotation.visibility === "public" &&
    typeof annotation.createdAt === "string" &&
    typeof annotation.text === "string" &&
    annotation.text.length > 0 &&
    !!annotation.selector &&
    typeof annotation.selector.exact === "string" &&
    annotation.selector.exact.length > 0 &&
    (annotation.tags === undefined ||
      (Array.isArray(annotation.tags) &&
        annotation.tags.every(tag => typeof tag === "string")))
  );
};

export const isPublicAnnotationFile = (
  value: unknown
): value is PublicAnnotationFile => {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<PublicAnnotationFile>;
  return (
    data.version === 1 &&
    Array.isArray(data.annotations) &&
    data.annotations.every(isPublicAnnotation)
  );
};

export const getPublicAnnotations = (entryId: string): PublicAnnotation[] => {
  const filePath = path.join(ANNOTATIONS_PATH, `${entryId}.json`);
  if (!fs.existsSync(filePath)) return [];

  try {
    const data: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (!isPublicAnnotationFile(data)) {
      console.warn(`[annotations] Invalid annotation data: ${filePath}`);
      return [];
    }

    return data.annotations;
  } catch (error) {
    console.warn(`[annotations] Could not read ${filePath}`, error);
    return [];
  }
};
