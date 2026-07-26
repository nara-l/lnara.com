export interface Env {
  ANNOTATIONS_DB: D1Database;
  ALLOWED_ORIGIN: string;
  AUTHOR_PASSWORD: string;
  SESSION_SECRET: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY: string;
  GITHUB_BRANCH: string;
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
  visibility: "private" | "public";
}

export interface StoredAnnotation extends AnnotationInput {
  slug: string;
  createdAt: string;
  updatedAt: string;
}
