import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

function runConvex(args) {
  const res = spawnSync(npxBin, ["convex", ...args], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`convex ${args.join(" ")} failed with exit code ${res.status}`);
  }
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const privatePem = privateKey
  .export({ type: "pkcs8", format: "pem" })
  .toString()
  .trim()
  .replace(/\r?\n/g, " ");

const publicJwk = publicKey.export({ format: "jwk" });
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicJwk }] });

const envFilePath = join(process.cwd(), ".env.convex.auth.tmp");
writeFileSync(envFilePath, `JWT_PRIVATE_KEY=${privatePem}\nJWKS=${jwks}\n`, {
  encoding: "utf8",
});

try {
  runConvex(["env", "set", "--from-file", envFilePath, "--force"]);
  runConvex(["env", "list"]);
} finally {
  unlinkSync(envFilePath);
}

console.log("Updated Convex env vars: JWT_PRIVATE_KEY and JWKS");
