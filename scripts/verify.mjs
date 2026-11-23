import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { MongoMemoryServer } from "mongodb-memory-server-core";

const dev = process.argv.includes("--dev");
const children = new Set();
let mongo;
// Empty values override Next's .env files; no database credentials are read.
const cleanEnv = { ...process.env, MONGODB_URI: "", BOOKMARKS_TEST_RUN: "1", NEXT_TELEMETRY_DISABLED: "1" };
function child(command, args, env) {
  const proc = spawn(command, args, { env, stdio: "inherit", detached: true });
  children.add(proc);
  return proc;
}
async function run(command, args, env = cleanEnv) {
  const proc = child(command, args, env);
  try {
    await new Promise((resolve, reject) => {
      proc.once("error", reject);
      proc.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} failed (${code ?? signal})`)));
    });
  } finally { await stop(proc); }
}
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function stop(proc) {
  children.delete(proc);
  // Completed commands no longer own a live process group. In particular,
  // do not signal a departed child's numeric PID after the OS can reuse it.
  if (!proc.pid || proc.exitCode !== null || proc.signalCode !== null) return;
  // Includes Next's workers, rather than only npm's wrapper process.
  try { process.kill(-proc.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  const deadline = Date.now() + 5000;
  while (proc.exitCode === null && proc.signalCode === null && Date.now() < deadline) await delay(50);
  if (proc.exitCode === null && proc.signalCode === null) {
    try { process.kill(-proc.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  }
}
async function ready(server, baseURL) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Owned Next server exited before readiness.");
    try {
      const response = await fetch(baseURL, { signal: AbortSignal.timeout(12_000) });
      if (response.ok) return;
    } catch { /* Startup/dev compilation may require several attempts. */ }
    await delay(250);
  }
  throw new Error("Owned Next server did not become ready.");
}
let cleaning;
function cleanup() {
  return cleaning ??= (async () => {
    for (const proc of [...children]) await stop(proc);
    if (mongo) await mongo.stop();
  })();
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => { await cleanup(); process.exit(signal === "SIGINT" ? 130 : 143); });
}
try {
  if (!dev) for (const script of ["lint", "typecheck", "test:unit", "build"]) await run("npm", ["run", script]);
  const dbName = `bookmarks_test_${randomUUID().replaceAll("-", "")}`;
  mongo = await MongoMemoryServer.create({ binary: { version: "9.0.4" }, instance: { ip: "127.0.0.1", dbName } });
  const uri = mongo.getUri(dbName);
  await run("npm", ["run", "db:setup"], { ...cleanEnv, MONGODB_URI: uri });
  const unavailablePort = await freePort();
  for (const [scenario, databaseURI] of [
    ["healthy", uri],
    ["missing", ""],
    ["unreachable", `mongodb://127.0.0.1:${unavailablePort}/${dbName}`],
  ]) {
    const port = await freePort();
    const baseURL = `http://127.0.0.1:${port}`;
    const env = { ...cleanEnv, MONGODB_URI: databaseURI, BOOKMARKS_TEST_URI: uri, BOOKMARKS_TEST_SCENARIO: scenario, BOOKMARKS_TEST_BASE_URL: baseURL };
    console.log(`Verifying ${dev ? "development" : "production"} runtime: ${scenario}`);
    const server = child("node", ["node_modules/next/dist/bin/next", dev ? "dev" : "start", "--hostname", "127.0.0.1", "--port", String(port)], env);
    try {
      await ready(server, baseURL);
      await run("node", ["node_modules/@playwright/test/cli.js", "test"], env);
    } finally { await stop(server); }
  }
} finally { await cleanup(); }
