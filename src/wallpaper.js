import { MEDIA_EXTENSIONS, isVideoFile, WALLPAPER_KEY, WALLPAPER_STRATEGY_KEY } from "./config.js";
import { wallpaperStrategies } from "./wallpaper-strategies.js";

// Owns exactly two media layers: one visible and one reusable preload layer.
export class WallpaperManager {
    constructor() { this.backgrounds = []; this.modes = []; this.index = 0; this.activeLayer = 0; this.token = 0; this.preloadToken = 0; this.preloaded = null; this.strategy = "random"; this.automaticStrategy = "random"; }
    async discover() {
        const entries = await new Promise(resolve => { if (!chrome.runtime?.getPackageDirectoryEntry) return resolve([]); chrome.runtime.getPackageDirectoryEntry(root => root.getDirectory("background", { create: false }, dir => { const reader = dir.createReader(); const all = []; const read = () => reader.readEntries(items => items.length ? (all.push(...items), read()) : resolve(all), () => resolve([])); read(); }, () => resolve([]))); });
        this.backgrounds = entries.filter(e => e.isFile && /^\d+\./i.test(e.name) && MEDIA_EXTENSIONS.test(e.name)).map(file => { const number = Number(file.name.match(/\d+/)[0]); const video = isVideoFile(file.name); return { mode: `${video ? "bg-video" : "bg-image"}-${number}`, file: `background/${file.name}`, isVideo: video, number }; }).sort((a, b) => a.number - b.number);
        this.modes = this.backgrounds.map(item => item.mode);
    }
    async loadSettings() {
        const result = await new Promise(resolve => chrome.storage.local.get([WALLPAPER_STRATEGY_KEY], resolve));
        this.strategy = result[WALLPAPER_STRATEGY_KEY] === "sequential" ? "sequential" : result[WALLPAPER_STRATEGY_KEY] === "manual" ? "manual" : "random";
        this.automaticStrategy = this.strategy === "sequential" ? "sequential" : "random";
    }
    get layer() { return index => document.getElementById(`bg-layer-${index}`); }
    get currentNumber() { return this.backgrounds[this.index]?.number ?? null; }
    async pickNext(strategy = this.strategy) { const value = wallpaperStrategies[strategy]; return value && this.modes.length ? value.pick(this.modes, this.index) : { mode: "", index: -1 }; }
    async nextForPreload() { if (this.strategy === "sequential") { const index = (this.index + 1) % this.modes.length; return { mode: this.modes[index], index }; } return this.pickNext("random"); }
    stopPreload() { ++this.preloadToken; if (this.preloaded) this.releaseLayer(this.preloaded.layer); this.preloaded = null; }
    fixCurrent() { const background = this.backgrounds[this.index]; if (!background) return false; if (this.strategy !== "manual") this.automaticStrategy = this.strategy; this.strategy = "manual"; this.stopPreload(); chrome.storage.local.set({ [WALLPAPER_STRATEGY_KEY]: "manual", [WALLPAPER_KEY]: background.mode }); return true; }
    async toggleFixed() { if (this.strategy !== "manual") return this.fixCurrent(); this.strategy = this.automaticStrategy || "random"; chrome.storage.local.set({ [WALLPAPER_STRATEGY_KEY]: this.strategy }); const pick = await this.pickNext(this.strategy); if (pick.mode) await this.set(pick.mode, { persist: false }); return false; }
    async setByNumber(number) { const background = this.backgrounds.find(item => item.number === number); if (!background) return false; this.strategy = "manual"; this.stopPreload(); chrome.storage.local.set({ [WALLPAPER_STRATEGY_KEY]: "manual", [WALLPAPER_KEY]: background.mode }); return this.set(background.mode, { persist: false }); }
    releaseLayer(index) { const layer = this.layer(index); const video = layer?.querySelector("video"); const image = layer?.querySelector("img"); if (video) { video.pause(); video.removeAttribute("src"); video.load(); } if (image) image.removeAttribute("src"); }
    async prepareLayer(index, background) {
        this.releaseLayer(index); const layer = this.layer(index); const video = layer?.querySelector("video"); const image = layer?.querySelector("img"); if (!layer || !background) return false;
        if (background.isVideo && video) { video.src = background.file; video.load(); try { await new Promise((resolve, reject) => { if (video.readyState >= 3) return resolve(); video.addEventListener("canplay", resolve, { once: true }); video.addEventListener("error", reject, { once: true }); }); } catch { return false; } }
        else if (image) { image.src = background.file; try { await image.decode(); } catch { return false; } }
        return true;
    }
    async preloadNext() {
        if (this.strategy === "manual" || this.modes.length < 2) return;
        const pick = await this.nextForPreload(); if (!pick.mode || pick.mode === this.modes[this.index]) return;
        const token = ++this.preloadToken; const layer = 1 - this.activeLayer; this.releaseLayer(layer); const background = this.backgrounds.find(item => item.mode === pick.mode); const promise = this.prepareLayer(layer, background);
        this.preloaded = { mode: pick.mode, layer, promise, token }; const ready = await promise;
        if (!ready || this.preloaded?.token !== token) { if (this.preloaded?.token === token) this.preloaded = null; this.releaseLayer(layer); }
    }
    async set(mode, { persist = true } = {}) {
        const background = this.backgrounds.find(item => item.mode === mode); if (!background) return false;
        const token = ++this.token; const next = 1 - this.activeLayer; let ready = false;
        if (this.preloaded?.mode === mode && this.preloaded.layer === next) { ready = await this.preloaded.promise; this.preloaded = null; }
        else { ++this.preloadToken; this.preloaded = null; ready = await this.prepareLayer(next, background); }
        if (!ready || token !== this.token) return false;
        const old = this.activeLayer; this.layer(old)?.classList.remove("is-active"); this.layer(next)?.classList.add("is-active"); this.activeLayer = next; this.index = this.modes.indexOf(mode); if (background.isVideo) this.layer(next)?.querySelector("video")?.play().catch(() => {}); if (persist) chrome.storage.local.set({ [WALLPAPER_KEY]: mode });
        setTimeout(() => { if (old !== this.activeLayer) this.releaseLayer(old); }, 450); setTimeout(() => this.preloadNext(), 500); return true;
    }
}
