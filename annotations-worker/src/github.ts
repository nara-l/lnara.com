import type { AnnotationInput, Env } from "./types";

interface GitHubFile {
  sha: string;
  content: string;
}

interface PublicFile {
  version: 1;
  annotations: Array<
    AnnotationInput & {
      visibility: "public";
      createdAt: string;
    }
  >;
}

const decode = (value: string) => {
  const binary = atob(value.replace(/\n/g, ""));
  return new TextDecoder().decode(
    Uint8Array.from(binary, char => char.charCodeAt(0))
  );
};

const encode = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => (binary += String.fromCharCode(byte)));
  return btoa(binary);
};

const updatePublicFile = async (
  env: Env,
  slug: string,
  mutate: (data: PublicFile) => { changed: boolean; data: PublicFile },
  message: string,
  fetcher: typeof fetch = fetch
) => {
  if (!env.GITHUB_TOKEN) throw new Error("Public publishing is not configured");
  const filePath = `src/data/annotations/${slug}.json`;
  const apiBase = env.GITHUB_API_URL ?? "https://api.github.com";
  const api = `${apiBase}/repos/${env.GITHUB_REPOSITORY}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "lnara-annotations-worker",
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await fetcher(
      `${api}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
      { headers }
    );
    let sha: string | undefined;
    let data: PublicFile = { version: 1, annotations: [] };

    if (current.ok) {
      const file = (await current.json()) as GitHubFile;
      sha = file.sha;
      data = JSON.parse(decode(file.content)) as PublicFile;
    } else if (current.status !== 404) {
      throw new Error(`GitHub read failed (${current.status})`);
    }

    if (data.version !== 1 || !Array.isArray(data.annotations)) {
      throw new Error("Public annotation file is invalid");
    }

    const mutation = mutate(data);
    if (!mutation.changed) return;

    const update = await fetcher(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message,
        branch: env.GITHUB_BRANCH,
        content: encode(`${JSON.stringify(mutation.data, null, 2)}\n`),
        ...(sha ? { sha } : {}),
      }),
    });
    if (update.ok) return;
    if (update.status !== 409 || attempt === 1) {
      throw new Error(`GitHub write failed (${update.status})`);
    }
  }
};

export const upsertPublicAnnotation = async (
  env: Env,
  slug: string,
  annotation: AnnotationInput,
  createdAt: string,
  fetcher: typeof fetch = fetch
) =>
  updatePublicFile(
    env,
    slug,
    data => {
      const next = {
        ...annotation,
        visibility: "public" as const,
        createdAt,
      };
      const index = data.annotations.findIndex(
        item => item.id === annotation.id
      );
      if (
        index !== -1 &&
        JSON.stringify(data.annotations[index]) === JSON.stringify(next)
      ) {
        return { changed: false, data };
      }

      const annotations = [...data.annotations];
      if (index === -1) annotations.push(next);
      else annotations[index] = next;
      return { changed: true, data: { version: 1, annotations } };
    },
    `Publish annotation for ${slug}`,
    fetcher
  );

export const removePublicAnnotation = async (
  env: Env,
  slug: string,
  annotationId: string,
  fetcher: typeof fetch = fetch
) =>
  updatePublicFile(
    env,
    slug,
    data => {
      const annotations = data.annotations.filter(
        item => item.id !== annotationId
      );
      return {
        changed: annotations.length !== data.annotations.length,
        data: { version: 1, annotations },
      };
    },
    `Remove annotation from ${slug}`,
    fetcher
  );

export const publishAnnotation = upsertPublicAnnotation;
