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
  
  // Destinations
  const destinations = [
    path.join(root, "gashapon-indexer", "src", "idl"),
    path.join(root, "frontend", "public", "idl"),
  ];

  if (!fs.existsSync(src)) {
    console.error(`IDL not found at ${src}. Run "anchor build" first.`);
    process.exit(1);
  }

  for (const destDir of destinations) {
    ensureDir(destDir);
    const dest = path.join(destDir, "gachapon_game.json");
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied IDL to ${dest}`);
  }
}

copyIdl();
