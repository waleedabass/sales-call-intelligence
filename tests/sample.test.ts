import { test } from "node:test";
import assert from "node:assert/strict";

test("sample analysis only reports risks grounded in the submitted transcript", async () => {
  const sample = await import("../src/lib/sample.ts").catch(() => null);
  assert.ok(sample, "sample analysis must be available");
  assert.throws(() => sample.analyzeSample("   "), /transcript/i);
  const clean = sample.analyzeSample("Rep: Thank you for joining our call.");
  assert.equal(clean.risks.length, 0);
  const risky = sample.analyzeSample("Buyer: Security is a blocker. We are comparing a competitor.");
  assert.equal(risky.risks.length, 2);
  assert.ok(risky.risks.every((risk: { evidence: string }) => risky.transcript.includes(risk.evidence)));
});

test("public mode stays safe unless live mode is explicitly enabled and configured", async () => {
  const mode = await import("../src/lib/demo-mode.ts").catch(() => null);
  assert.ok(mode, "demo policy must be available");
  assert.equal(mode.isDemoMode({}), true);
  assert.equal(mode.isDemoMode({ ENABLE_LIVE_DEMO: "true" }), true);
  assert.equal(mode.isDemoMode({ ENABLE_LIVE_DEMO: "true", DATABASE_URL: "file:test.db", GEMINI_API_KEY: "test-placeholder" }), false);
});
