import type { CollectionEntry } from "astro:content";
import { getPath } from "./getPath";

export const isNote = (entry: CollectionEntry<"blog">) =>
  entry.data.tags.includes("notes");

export const isSeries = (entry: CollectionEntry<"blog">) =>
  entry.data.tags.includes("series");

export const getEntryPath = (entry: CollectionEntry<"blog">) =>
  getPath(entry.id, entry.filePath, true, isNote(entry) ? "/notes" : "/posts");

export const getNotePath = (
  id: string,
  filePath: string | undefined,
  includeBase = true
) => getPath(id, filePath, includeBase, "/notes");
