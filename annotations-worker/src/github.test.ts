import { describe, expect, it, vi } from "vitest";
import { publishAnnotation } from "./github";
import type { AnnotationInput, Env } from "./types";

const env = {
  GITHUB_TOKEN: "token",
  GITHUB_REPOSITORY: "nara-l/lnara.com",
  GITHUB_BRANCH: "feature",
} as Env;

const input: AnnotationInput = {
  id: "annotation-123456",
  selector: { exact: "Trust is accumulated evidence." },
  text: "A note",
  tags: [],
  visibility: "public",
};

describe("public annotation publishing", () => {
  it("creates a sidecar file when one does not exist", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ commit: { sha: "new" } }));

    await publishAnnotation(env, "trust-note", input, "2026-07-26", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    const request = fetcher.mock.calls[1];
    const body = JSON.parse(String(request[1]?.body));
    const decoded = atob(body.content);
    expect(decoded).toContain('"id": "annotation-123456"');
    expect(body.branch).toBe("feature");
  });

  it("treats an existing annotation id as an idempotent success", async () => {
    const sidecar = {
      version: 1,
      annotations: [{ ...input, createdAt: "2026-07-26" }],
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        sha: "current",
        content: btoa(JSON.stringify(sidecar)),
      })
    );

    await publishAnnotation(env, "trust-note", input, "2026-07-26", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches once after an optimistic concurrency conflict", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ commit: { sha: "new" } }));

    await publishAnnotation(env, "trust-note", input, "2026-07-26", fetcher);

    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});
