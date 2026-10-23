import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const IMG = /\.(png|jpe?g|webp|bmp|gif)$/i;
const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
};

/* Folders served to the app. Set DB_DIR to point the app at any folder of images:
   DB_DIR=/path/to/photos npm run dev */
const DB_DIR = path.resolve(process.env.DB_DIR || path.join(here, "database"));
const SAMPLE_DIR = path.join(here, "sample-uploads");

function walk(dir, base, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else if (IMG.test(e.name))
      out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

function folderApi() {
  const handler = (req, res, next) => {
    const url = decodeURIComponent((req.url || "").split("?")[0]);
    const maps = [
      ["/api/database", DB_DIR, "/database-files/"],
      ["/api/samples", SAMPLE_DIR, "/sample-files/"],
    ];
    for (const [api, dir, files] of maps) {
      if (url === api) {
        const list = walk(dir, dir, [])
          .sort()
          .map((p) => ({
            path: p,
            name: path.basename(p),
            folder: p.includes("/") ? p.split("/").slice(-2)[0] : "",
          }));
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ dir: path.basename(dir), files: list }));
        return;
      }
      if (url.startsWith(files)) {
        const full = path.resolve(dir, url.slice(files.length));
        if (
          !full.startsWith(dir + path.sep) ||
          !fs.existsSync(full) ||
          !fs.statSync(full).isFile()
        ) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.setHeader(
          "Content-Type",
          MIME[path.extname(full).toLowerCase()] || "application/octet-stream",
        );
        fs.createReadStream(full).pipe(res);
        return;
      }
    }
    next();
  };
  return {
    name: "folder-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({ plugins: [react(), folderApi()],
   base: "/Image-Matching-Software/",
 });
