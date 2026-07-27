export interface Env {
  ANNOTATIONS_DB: D1Database;
  ALLOWED_ORIGIN: string;
  AUTHOR_PASSWORD: string;
  SESSION_SECRET: string;
}

export interface AnnotationInput {
  id: string;
  selector: {
    exact: string;
    prefix?: string;
    suffix?: string;
  };
  text: string;
  tags: string[];
}

export interface StoredAnnotation extends AnnotationInput {
  slug: string;
  visibility: "public";
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationPatch {
  text?: string;
  tags?: string[];
}
