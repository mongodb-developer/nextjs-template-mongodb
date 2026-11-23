import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../../scripts/setup-db.mjs", import.meta.url));

test("database setup rejects missing configuration without connecting", () => {
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, MONGODB_URI: "" }, encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set MONGODB_URI/);
});

test("malformed database URLs never expose credentials in setup output", () => {
  for (const uri of ["mongodb://user:TEST_SECRET@@host/db", "mongodb://user:TEST_SECRET@/db"]) {
    const result = spawnSync(process.execPath, [script], {
      env: { ...process.env, MONGODB_URI: uri }, encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not prepare the bookmark index/);
    assert.doesNotMatch(result.stdout + result.stderr, /TEST_SECRET|mongodb:\/\/|MongoParseError/);
  }
});
