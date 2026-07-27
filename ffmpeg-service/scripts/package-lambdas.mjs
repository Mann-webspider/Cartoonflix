// Bundle the orchestrator + completion Lambdas and zip them for Terraform.
// @aws-sdk/* is provided by the nodejs20.x runtime, so it is left external;
// mongodb is bundled. Requires the `zip` CLI (present in CI / Linux / macOS).
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
fs.mkdirSync(dist, { recursive: true });

const targets = [
  { name: "orchestrator", entry: "src/lambdas/orchestrator.js" },
  { name: "completion", entry: "src/lambdas/completion.js" },
];

for (const t of targets) {
  const outfile = path.join(dist, `${t.name}.js`);
  await build({
    entryPoints: [t.entry],
    outfile,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    external: ["@aws-sdk/*"],
    logLevel: "info",
  });

  const zipPath = path.join(dist, `${t.name}.zip`);
  fs.rmSync(zipPath, { force: true });
  // -j: flatten so the handler file sits at the zip root (handler = `${name}.handler`)
  execFileSync("zip", ["-j", zipPath, outfile], { stdio: "inherit" });
  console.log(`Packaged ${zipPath}`);
}
