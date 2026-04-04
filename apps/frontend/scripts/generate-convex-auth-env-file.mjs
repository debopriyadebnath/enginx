import { generateKeyPairSync } from "node:crypto";
import { writeFileSync } from "node:fs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const privatePem = privateKey
  .export({ type: "pkcs8", format: "pem" })
  .toString()
  .trim()
  .replace(/\r?\n/g, " ");

const jwks = JSON.stringify({
  keys: [{ use: "sig", ...publicKey.export({ format: "jwk" }) }],
});

writeFileSync(
  ".env.convex.auth.tmp",
  `JWT_PRIVATE_KEY=${privatePem}\nJWKS=${jwks}\n`,
  "utf8"
);

console.log("Generated .env.convex.auth.tmp");
