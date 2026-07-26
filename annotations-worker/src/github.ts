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

export const publishAnnotation = async (
  env: Env,
  slug: string,
  annotation: AnnotationInput,
  createdAt: string,
  fetcher: typeof fetch = fetch
) => {
  if (!env.GITHUB_TOKEN) throw new Error("Public publishing is not configured");
  const filePath = `src/data/annotations/${slug}.json`;
  const api = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/${filePath}`;
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

    if (data.annotations.some(item => item.id === annotation.id)) return;
    data.annotations.push({
      ...annotation,
      visibility: "public",
      createdAt,
    });

    const update = await fetcher(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `Publish annotation for ${slug}`,
        branch: env.GITHUB_BRANCH,
        content: encode(`${JSON.stringify(data, null, 2)}\n`),
        ...(sha ? { sha } : {}),
      }),
    });
    if (update.ok) return;
    if (update.status !== 409 || attempt === 1) {
      throw new Error(`GitHub write failed (${update.status})`);
    }
  }
};
