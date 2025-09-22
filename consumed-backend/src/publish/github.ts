import type { Env } from "../sheets";

type CommitFile = { path: string; content: string };

export async function commitFilesToGitHub(env: Env & { GITHUB_TOKEN?: string; VERCEL_TOKEN?: string; VERCEL_PROJECT_ID?: string }, message: string, files: CommitFile[]): Promise<Response> {
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

  // Trigger Vercel deployment to ensure immediate rebuild
  try {
    await triggerVercelDeployment(env);
  } catch (err) {
    console.warn("Failed to trigger Vercel deployment:", err);
  }

  return new Response(`Successfully committed ${files.length} files`, { status: 200 });
}

async function triggerVercelDeployment(env: { VERCEL_TOKEN?: string; VERCEL_PROJECT_ID?: string }): Promise<void> {
  // Use Vercel API to trigger deployment
  if (!env.VERCEL_TOKEN || !env.VERCEL_PROJECT_ID) {
    console.log("Vercel deployment not configured - GitHub auto-deploy should handle this");
    return;
  }

  try {
    // Trigger a new deployment via Vercel API
    const response = await fetch(
      `https://api.vercel.com/v13/deployments`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.VERCEL_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "name": "lnara-com",
          "gitSource": {
            "type": "github",
            "repo": "nara-l/lnara.com",
            "ref": "master"
          },
          "projectSettings": {
            "buildCommand": "npm run build",
            "outputDirectory": "dist"
          }
        })
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log("Successfully triggered Vercel deployment:", result.id);
    } else {
      console.error("Vercel deployment failed:", response.status, await response.text());
    }
  } catch (err) {
    console.error("Error triggering Vercel deployment:", err);
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

