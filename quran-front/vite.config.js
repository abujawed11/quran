import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // server: {
  //   host: true,
  // },
  plugins: [
    react(),
    {
      name: "audio-stream",
      configureServer(server) {
        // Serve audio through /api/audio?r={reciter}&f={surahAyah}
        // IDM only intercepts URLs ending in known extensions (.mp3, .mp4 etc).
        // A query-parameter URL like /api/audio?r=...&f=... is never intercepted.
        server.middlewares.use("/api/audio", (req, res) => {
          const qs      = req.url?.slice(1) ?? ""; // strip leading "?"
          const params  = new URLSearchParams(qs);
          const reciter = params.get("r");
          const file    = params.get("f");

          if (!reciter || !file) {
            res.statusCode = 400;
            res.end("Bad request");
            return;
          }

          const filePath = path.join(
            process.cwd(),
            "public/audio",
            reciter,
            file + ".mp3"
          );

          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }

          const stat = fs.statSync(filePath);
          res.setHeader("Content-Type",        "audio/mpeg");
          res.setHeader("Content-Length",      stat.size);
          res.setHeader("Content-Disposition", "inline");
          res.setHeader("Accept-Ranges",       "bytes");
          fs.createReadStream(filePath).pipe(res);
        });

        // Serve translation audio: /api/translation?t={translator}&f={surahAyah}
        server.middlewares.use("/api/translation", (req, res) => {
          const qs         = req.url?.slice(1) ?? "";
          const params     = new URLSearchParams(qs);
          const translator = params.get("t");
          const file       = params.get("f");

          if (!translator || !file) {
            res.statusCode = 400;
            res.end("Bad request");
            return;
          }

          const filePath = path.join(
            process.cwd(),
            "public/audio/translations",
            translator,
            file + ".mp3"
          );

          if (!fs.existsSync(filePath)) {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }

          const stat = fs.statSync(filePath);
          res.setHeader("Content-Type",        "audio/mpeg");
          res.setHeader("Content-Length",      stat.size);
          res.setHeader("Content-Disposition", "inline");
          res.setHeader("Accept-Ranges",       "bytes");
          fs.createReadStream(filePath).pipe(res);
        });
      },
    },
  ],
})
