import { WALLPAPER_KEY } from "./src/config.js";
import { loadSpaces, flushStorage } from "./src/storage.js";
import { WallpaperManager } from "./src/wallpaper.js";
import { render, initUI } from "./src/ui.js";

const wallpapers = new WallpaperManager();

async function start() {
    await Promise.all([wallpapers.discover(), wallpapers.loadSettings(), loadSpaces()]);
    const saved = await new Promise(resolve => chrome.storage.local.get([WALLPAPER_KEY], resolve));
    if (wallpapers.strategy === "manual" && saved[WALLPAPER_KEY] && wallpapers.modes.includes(saved[WALLPAPER_KEY])) {
        await wallpapers.set(saved[WALLPAPER_KEY], { persist: false });
    } else {
        const pick = await wallpapers.pickNext(wallpapers.strategy);
        if (pick.mode) await wallpapers.set(pick.mode, { persist: false });
    }
    const repaint = () => render(repaint);
    document.body.classList.toggle("space-private", false); repaint(); initUI(repaint, wallpapers);
}

document.addEventListener("visibilitychange", () => { if (document.hidden) flushStorage(); else document.querySelector(`#bg-layer-${wallpapers.activeLayer} video`)?.play().catch(() => {}); });
window.addEventListener("pagehide", () => flushStorage());
document.addEventListener("DOMContentLoaded", start);
window.wallpaperManager = wallpapers;
