/**
 * Generates RS256 key material for Convex Auth.
 * Run from apps/frontend: node scripts/generate-convex-auth-keys.mjs
 *
 * Convex Auth (jose importPKCS8) requires JWT_PRIVATE_KEY to START with
 * `-----BEGIN PRIVATE KEY-----` — no leading space, no "JWT_PRIVATE_KEY=" prefix
 * in the value field, and no BOM. Prefer `--from-file` below to avoid paste errors.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");
const envTmpPath = join(frontendRoot, ".env.convex.auth.tmp");

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

const singleLinePrivate = privateKey.trimEnd().replace(/\n/g, " ");

if (!singleLinePrivate.startsWith("-----BEGIN PRIVATE KEY-----")) {
  throw new Error("Unexpected PEM format from jose exportPKCS8");
}

const envFileBody = `JWT_PRIVATE_KEY=${singleLinePrivate}\nJWKS=${jwks}\n`;
writeFileSync(envTmpPath, envFileBody, "utf8");

console.log("\n--- Convex Auth keys ---\n");
console.log(`Wrote (secret): ${envTmpPath}`);
console.log("\nPush to your Convex deployment (from apps/frontend):\n");
console.log("  npx convex env set --from-file .env.convex.auth.tmp --force");
console.log("\nThen delete .env.convex.auth.tmp. Do not commit it.\n");
console.log("--- Manual copy (value must BEGIN with -----BEGIN PRIVATE KEY----- ---\n");
console.log(`JWT_PRIVATE_KEY=${singleLinePrivate}`);
console.log("");
console.log(`JWKS=${jwks}`);
console.log(
  "\nTip: CONVEX_SITE_URL should match your deployment site URL (see convex dashboard).\n"
);
