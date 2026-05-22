#!/usr/bin/env node
// Workaround for an upstream packaging bug in libsodium-wrappers-sumo:
// its ESM build imports './libsodium-sumo.mjs' but that file actually
// lives in the sibling `libsodium-sumo` package. With pnpm + ESM strict
// resolution Node can't find it, so we symlink it into place.
import { existsSync, symlinkSync, statSync } from "node:fs";
import { join, dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = pathResolve(__dirname, "..");

function tryFix(modulesDir) {
  if (!existsSync(modulesDir)) return false;
  const wrapper = join(
    modulesDir,
    "libsodium-wrappers-sumo/dist/modules-sumo-esm"
  );
  const sumoSrc = join(
    modulesDir,
    "libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs"
  );
  const target = join(wrapper, "libsodium-sumo.mjs");

  if (!existsSync(wrapper) || !existsSync(sumoSrc)) return false;
  if (existsSync(target)) {
    try {
      statSync(target);
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    symlinkSync(
      "../../../libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs",
      target
    );
    console.log("[fix-libsodium] linked", target);
    return true;
  } catch (err) {
    console.warn("[fix-libsodium] failed:", err?.message ?? err);
    return false;
  }
}

tryFix(join(root, "node_modules"));
