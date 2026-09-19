import { loadSpaces, flushStorage } from "./src/storage.js";
import { WallpaperManager } from "./src/wallpaper.js";
import { initializeUI } from "./src/ui.js";

const wallpapers = new WallpaperManager();

async function start() {
    await Promise.all([wallpapers.initialize(), loadSpaces()]);
    document.body.classList.remove("space-private");
    initializeUI(wallpapers);
}

document.addEventListener("visibilitychange", () => document.hidden ? flushStorage() : wallpapers.resumeActiveVideo());
window.addEventListener("pagehide", () => flushStorage());
document.addEventListener("DOMContentLoaded", start);
