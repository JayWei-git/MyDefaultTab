import { MEDIA_EXTENSIONS, isVideoFile, WALLPAPER_KEY, WALLPAPER_STRATEGY_KEY } from "./config.js";
import { wallpaperStrategies } from "./wallpaper-strategies.js";

const storageGet = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));

// Owns exactly two media layers: one visible and one reusable preload layer.
export class WallpaperManager {
    constructor() {
        this.backgrounds = [];
        this.backgroundByMode = new Map();
        this.modes = [];
        this.index = 0;
        this.activeLayer = 0;
        this.requestToken = 0;
        this.preloadToken = 0;
        this.layerVersions = [0, 0];
        this.preloaded = null;
        this.strategy = "random";
        this.automaticStrategy = "random";
    }

    async initialize() {
        await Promise.all([this.discover(), this.loadSettings()]);
        const saved = await storageGet([WALLPAPER_KEY]);
        const savedMode = saved[WALLPAPER_KEY];
        const mode = this.strategy === "manual" && this.backgroundByMode.has(savedMode)
            ? savedMode
            : (await this.pickNext(this.strategy)).mode;
        if (mode) await this.set(mode, { persist: false });
    }

    async discover() {
        const entries = await new Promise(resolve => {
            if (!chrome.runtime?.getPackageDirectoryEntry) return resolve([]);
            chrome.runtime.getPackageDirectoryEntry(root => {
                root.getDirectory("background", { create: false }, directory => {
                    const reader = directory.createReader();
                    const all = [];
                    const read = () => reader.readEntries(
                        items => items.length ? (all.push(...items), read()) : resolve(all),
                        () => resolve([])
                    );
                    read();
                }, () => resolve([]));
            });
        });

        this.backgrounds = entries
            .filter(entry => entry.isFile && /^\d+\./i.test(entry.name) && MEDIA_EXTENSIONS.test(entry.name))
            .map(file => {
                const number = Number(file.name.match(/\d+/)[0]);
                const isVideo = isVideoFile(file.name);
                return {
                    mode: `${isVideo ? "bg-video" : "bg-image"}-${number}`,
                    file: `background/${file.name}`,
                    isVideo,
                    number
                };
            })
            .sort((a, b) => a.number - b.number);
        this.modes = this.backgrounds.map(item => item.mode);
        this.backgroundByMode = new Map(this.backgrounds.map(item => [item.mode, item]));
    }

    async loadSettings() {
        const result = await storageGet([WALLPAPER_STRATEGY_KEY]);
        const saved = result[WALLPAPER_STRATEGY_KEY];
        this.strategy = saved === "sequential" ? "sequential" : saved === "manual" ? "manual" : "random";
        this.automaticStrategy = this.strategy === "sequential" ? "sequential" : "random";
    }

    layer(index) {
        return document.getElementById(`bg-layer-${index}`);
    }

    get currentNumber() {
        return this.backgrounds[this.index]?.number ?? null;
    }

    get numberHint() {
        const numbers = this.backgrounds.map(item => item.number);
        if (!numbers.length) return "unavailable";
        const contiguous = numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1);
        if (contiguous) return numbers.length === 1 ? String(numbers[0]) : `${numbers[0]}-${numbers.at(-1)}`;
        return numbers.length <= 12 ? numbers.join(", ") : `${numbers.slice(0, 12).join(", ")}, …`;
    }

    async pickNext(strategy = this.strategy) {
        const picker = wallpaperStrategies[strategy];
        return picker && this.modes.length
            ? picker.pick(this.modes, this.index)
            : { mode: "", index: -1 };
    }

    async nextForPreload() {
        if (this.strategy === "sequential") {
            const index = (this.index + 1) % this.modes.length;
            return { mode: this.modes[index], index };
        }
        return this.pickNext("random");
    }

    async setStrategy(strategy) {
        if (!wallpaperStrategies[strategy]) return false;
        this.strategy = strategy;
        this.automaticStrategy = strategy;
        this.stopPreload();
        chrome.storage.local.set({ [WALLPAPER_STRATEGY_KEY]: strategy });
        const pick = await this.pickNext(strategy);
        return pick.mode ? this.set(pick.mode, { persist: false }) : false;
    }

    stopPreload() {
        ++this.preloadToken;
        if (this.preloaded && this.preloaded.layer !== this.activeLayer) this.invalidateLayer(this.preloaded.layer);
        this.preloaded = null;
    }

    fixCurrent() {
        const background = this.backgrounds[this.index];
        if (!background) return false;
        if (this.strategy !== "manual") this.automaticStrategy = this.strategy;
        this.strategy = "manual";
        this.stopPreload();
        chrome.storage.local.set({
            [WALLPAPER_STRATEGY_KEY]: "manual",
            [WALLPAPER_KEY]: background.mode
        });
        return true;
    }

    async toggleFixed() {
        if (this.strategy !== "manual") return this.fixCurrent();
        await this.setStrategy(this.automaticStrategy || "random");
        return false;
    }

    async setByNumber(number) {
        const background = this.backgrounds.find(item => item.number === number);
        if (!background) return false;
        if (this.strategy !== "manual") this.automaticStrategy = this.strategy;
        this.strategy = "manual";
        this.stopPreload();
        chrome.storage.local.set({
            [WALLPAPER_STRATEGY_KEY]: "manual",
            [WALLPAPER_KEY]: background.mode
        });
        return background.mode === this.modes[this.index]
            ? true
            : this.set(background.mode, { persist: false });
    }

    releaseLayer(index) {
        const layer = this.layer(index);
        const video = layer?.querySelector("video");
        const image = layer?.querySelector("img");
        if (video) {
            video.pause();
            video.removeAttribute("src");
            video.load();
        }
        image?.removeAttribute("src");
    }

    invalidateLayer(index) {
        ++this.layerVersions[index];
        this.releaseLayer(index);
    }

    async prepareLayer(index, background) {
        const version = ++this.layerVersions[index];
        this.releaseLayer(index);
        const layer = this.layer(index);
        const video = layer?.querySelector("video");
        const image = layer?.querySelector("img");
        if (!layer || !background) return false;

        if (background.isVideo && video) {
            video.src = background.file;
            video.load();
            try {
                await new Promise((resolve, reject) => {
                    if (video.readyState >= 3) return resolve();
                    video.addEventListener("canplay", resolve, { once: true });
                    video.addEventListener("error", reject, { once: true });
                });
            } catch {
                return false;
            }
        } else if (image) {
            image.src = background.file;
            try {
                await image.decode();
            } catch {
                return false;
            }
        }
        return version === this.layerVersions[index];
    }

    async preloadNext() {
        if (this.strategy === "manual" || this.modes.length < 2) return;
        const pick = await this.nextForPreload();
        if (!pick.mode || pick.mode === this.modes[this.index]) return;

        const token = ++this.preloadToken;
        const layer = 1 - this.activeLayer;
        const background = this.backgroundByMode.get(pick.mode);
        const promise = this.prepareLayer(layer, background);
        this.preloaded = { mode: pick.mode, layer, promise, token };
        const ready = await promise;
        if (!ready && this.preloaded?.token === token) {
            this.preloaded = null;
            if (layer !== this.activeLayer) this.invalidateLayer(layer);
        }
    }

    async set(mode, { persist = true } = {}) {
        const background = this.backgroundByMode.get(mode);
        if (!background) return false;

        const token = ++this.requestToken;
        const next = 1 - this.activeLayer;
        let ready;
        if (this.preloaded?.mode === mode && this.preloaded.layer === next) {
            ready = await this.preloaded.promise;
            this.preloaded = null;
        } else {
            ++this.preloadToken;
            this.preloaded = null;
            ready = await this.prepareLayer(next, background);
        }
        if (!ready || token !== this.requestToken) return false;

        const old = this.activeLayer;
        this.layer(old)?.classList.remove("is-active");
        this.layer(next)?.classList.add("is-active");
        this.activeLayer = next;
        this.index = this.modes.indexOf(mode);
        if (background.isVideo) this.layer(next)?.querySelector("video")?.play().catch(() => {});
        if (persist) chrome.storage.local.set({ [WALLPAPER_KEY]: mode });

        setTimeout(() => {
            if (old !== this.activeLayer) this.invalidateLayer(old);
        }, 450);
        setTimeout(() => this.preloadNext(), 500);
        return true;
    }

    resumeActiveVideo() {
        this.layer(this.activeLayer)?.querySelector("video")?.play().catch(() => {});
    }
}
