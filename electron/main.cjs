// Electron wrapper for the full (uncapped) build.
//
// The game is a Vite SPA that uses ES modules and runtime fetch() (the audio
// system HEAD-checks which tracks exist). Both of those fail under file://, so
// we serve the built files from a tiny local HTTP server and point the window
// at http://127.0.0.1, which behaves exactly like the web version.

const { app, BrowserWindow, Menu, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

// The built web app: a real folder beside the exe in production (copied via
// electron-builder extraResources), or ./dist-full during local dev.
const APP_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "..", "dist-full");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".txt": "text/plain; charset=utf-8",
};

// Minimal static server. Real files only — missing files return 404 so the
// game's audio existence checks (fetch HEAD) behave correctly. No SPA fallback
// is needed (the game has no client-side routing).
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = urlPath === "/" ? "/index.html" : urlPath;
        const filePath = path.join(APP_ROOT, path.normalize(rel));
        if (!filePath.startsWith(APP_ROOT)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end("Server error");
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function createWindow() {
  const port = await startServer();
  const win = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 380,
    minHeight: 600,
    backgroundColor: "#0a0a14",
    title: "Meow Rush: Gauntlet",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  Menu.setApplicationMenu(null);

  // Keep our own pages in-app; send any real external links to the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1:")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => app.quit());
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
