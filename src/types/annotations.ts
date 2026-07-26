export type AnnotationVisibility = "public" | "private";

export interface TextQuoteSelector {
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface PublicAnnotation {
  id: string;
  selector: TextQuoteSelector;
  text: string;
  tags?: string[];
  createdAt: string;
  visibility: "public";
}

export interface PublicAnnotationFile {
  version: 1;
  annotations: PublicAnnotation[];
}
