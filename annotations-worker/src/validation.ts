import type { AnnotationInput } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[a-z0-9][a-z0-9-]{7,63}$/;
const TAG = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const validateSlug = (value: string) => SLUG.test(value);

export const parseAnnotationInput = (value: unknown): AnnotationInput | null => {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<AnnotationInput>;
  const selector = input.selector;

  if (
    typeof input.id !== "string" ||
    !ID.test(input.id) ||
    !selector ||
    typeof selector.exact !== "string" ||
    selector.exact.trim().length < 2 ||
    selector.exact.length > 1000 ||
    (selector.prefix !== undefined &&
      (typeof selector.prefix !== "string" || selector.prefix.length > 160)) ||
    (selector.suffix !== undefined &&
      (typeof selector.suffix !== "string" || selector.suffix.length > 160)) ||
    typeof input.text !== "string" ||
    input.text.trim().length < 1 ||
    input.text.length > 5000 ||
    !Array.isArray(input.tags) ||
    input.tags.length > 12 ||
    !input.tags.every(tag => typeof tag === "string" && TAG.test(tag)) ||
    (input.visibility !== "private" && input.visibility !== "public")
  ) {
    return null;
  }

  return {
    id: input.id,
    selector: {
      exact: selector.exact,
      ...(selector.prefix ? { prefix: selector.prefix } : {}),
      ...(selector.suffix ? { suffix: selector.suffix } : {}),
    },
    text: input.text.trim(),
    tags: [...new Set(input.tags)],
    visibility: input.visibility,
  };
};
