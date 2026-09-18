import { WALLPAPER_INDEX_KEY } from "./config.js";

export const wallpaperStrategies = {
    sequential: {
        async pick(modes) {
            const result = await new Promise(resolve => chrome.storage.local.get([WALLPAPER_INDEX_KEY], resolve));
            const last = Number.isInteger(result[WALLPAPER_INDEX_KEY]) ? result[WALLPAPER_INDEX_KEY] : -1;
            const index = (last + 1 + modes.length) % modes.length;
            await new Promise(resolve => chrome.storage.local.set({ [WALLPAPER_INDEX_KEY]: index }, resolve));
            return { mode: modes[index], index };
        }
    },
    random: {
        async pick(modes, currentIndex = -1) {
            if (modes.length < 2) return { mode: modes[0] || "", index: 0 };
            let index = Math.floor(Math.random() * modes.length);
            if (index === currentIndex) index = (index + 1) % modes.length;
            return { mode: modes[index], index };
        }
    }
};

export function registerWallpaperStrategy(name, strategy) {
    if (!name || !strategy?.pick) throw new Error("A wallpaper strategy requires a name and pick function");
    wallpaperStrategies[name] = strategy;
}
