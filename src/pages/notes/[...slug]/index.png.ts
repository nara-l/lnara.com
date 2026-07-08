import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getNotePath, isNote } from "@/utils/entryPaths";
import { generateOgImageForPost } from "@/utils/generateOgImages";
import { SITE } from "@/config";

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage) {
    return [];
  }

  const notes = await getCollection("blog").then(entries =>
    entries.filter(
      entry => !entry.data.draft && !entry.data.ogImage && isNote(entry)
    )
  );

  return notes.map(note => ({
    params: { slug: getNotePath(note.id, note.filePath, false) },
    props: note,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await generateOgImageForPost(props as CollectionEntry<"blog">);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
