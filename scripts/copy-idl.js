/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIdl() {
  const root = process.cwd();
  const src = path.join(root, "target", "idl", "gachapon_game.json");
  const destDir = path.join(root, "gashapon-indexer", "src", "idl");
  const dest = path.join(destDir, "gachapon_game.json");

  if (!fs.existsSync(src)) {
    console.error(`IDL not found at ${src}. Run "anchor build" first.`);
    process.exit(1);
  }

  ensureDir(destDir);
  fs.copyFileSync(src, dest);
  console.log(`✅ Copied IDL to ${dest}`);
}

copyIdl();
