import type { Env } from "../sheets";

type CommitFile = { path: string; content: string };

export async function commitFilesToGitHub(env: Env & { GITHUB_TOKEN?: string; CF_PAGES_DEPLOY_HOOK_URL?: string }, message: string, files: CommitFile[]): Promise<Response> {
  if (!env.GITHUB_TOKEN) {
    return new Response("GITHUB_TOKEN not configured; cannot push to repo", { status: 501 });
  }
  const [owner, repo] = env.PUBLIC_REPO.split("/");
  const branch = env.PUBLIC_REPO_BRANCH || "main";

  // Strategy: Use Contents API for simpler, per-file commits
  // This is safer and more reliable than Git Data API in Workers
  const api = "https://api.github.com";
  const auth = { Authorization: `Bearer ${env.GITHUB_TOKEN}`, "Content-Type": "application/json", "User-Agent": "consumed-backend" } as const;

  const results: Response[] = [];

  for (const file of files) {
    try {
      // 1) Get current file SHA if it exists
      let existingSha: string | undefined;
      const getRes = await fetch(`${api}/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`, { headers: auth });

      if (getRes.ok) {
        const existing = await getRes.json() as any;
        existingSha = existing.sha;
      } else if (getRes.status !== 404) {
        // Error other than "file not found"
        results.push(getRes);
        continue;
      }

      // 2) Create or update file
      const content = btoa(unescape(encodeURIComponent(file.content))); // Base64 encode UTF-8
      const putBody: any = {
        message: `${message} - ${file.path}`,
        content,
        branch
      };

      if (existingSha) {
        putBody.sha = existingSha;
      }

      const putRes = await fetch(`${api}/repos/${owner}/${repo}/contents/${file.path}`, {
        method: "PUT",
        headers: auth,
        body: JSON.stringify(putBody),
      });

      results.push(putRes);

      if (!putRes.ok) {
        console.error(`Failed to commit ${file.path}:`, await putRes.text());
      }

    } catch (err) {
      console.error(`Error committing ${file.path}:`, err);
      results.push(new Response(`Error: ${err}`, { status: 500 }));
    }
  }

  // Check if all commits succeeded
  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    return new Response(`${failed.length} of ${files.length} file commits failed`, { status: 207 }); // Multi-status
  }

  // Trigger Cloudflare Pages deployment to ensure immediate rebuild
  try {
    await triggerCloudflareDeployment(env);
  } catch (err) {
    console.warn("Failed to trigger Cloudflare deployment:", err);
  }

  return new Response(`Successfully committed ${files.length} files`, { status: 200 });
}

async function triggerCloudflareDeployment(env: { CF_PAGES_DEPLOY_HOOK_URL?: string }): Promise<void> {
  // Use official Cloudflare Pages Deploy Hook for reliable force rebuilds
  if (!env.CF_PAGES_DEPLOY_HOOK_URL) {
    console.warn("CF_PAGES_DEPLOY_HOOK_URL not configured; skipping deploy hook trigger");
    return;
  }

  try {
    const response = await fetch(env.CF_PAGES_DEPLOY_HOOK_URL, {
      method: "POST",
      headers: { "User-Agent": "consumed-backend" }
    });

    if (response.ok) {
      console.log("Successfully triggered Cloudflare Pages deployment via Deploy Hook");
    } else {
      console.error("Deploy Hook failed:", response.status, await response.text());
    }
  } catch (err) {
    console.error("Error calling Deploy Hook:", err);
    throw err;
  }
}

// Helper function to encode content as base64 (GitHub Contents API requirement)
function encodeBase64(content: string): string {
  try {
    // Use TextEncoder for proper UTF-8 encoding, then convert to base64
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    return btoa(String.fromCharCode(...bytes));
  } catch {
    // Fallback for older environments
    return btoa(unescape(encodeURIComponent(content)));
  }
}

