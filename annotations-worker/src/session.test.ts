import { describe, expect, it } from "vitest";
import { createSession, verifySession } from "./session";

describe("author sessions", () => {
  it("accepts a signed unexpired session", async () => {
    const token = await createSession("a-long-test-secret", 1000);
    await expect(verifySession(token, "a-long-test-secret", 2000)).resolves.toBe(
      true
    );
  });

  it("rejects tampered, wrong-secret, and expired sessions", async () => {
    const token = await createSession("a-long-test-secret", 1000);
    await expect(verifySession(`${token}x`, "a-long-test-secret", 2000)).resolves.toBe(
      false
    );
    await expect(verifySession(token, "wrong-secret", 2000)).resolves.toBe(false);
    await expect(
      verifySession(token, "a-long-test-secret", 9 * 60 * 60 * 1000)
    ).resolves.toBe(false);
  });
});
