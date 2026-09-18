import { ICONS_HIDDEN_KEY } from "./config.js";

export async function loadPreferences() {
    return new Promise(resolve => chrome.storage.local.get([ICONS_HIDDEN_KEY], resolve));
}
export function setIconsHidden(hidden) { chrome.storage.local.set({ [ICONS_HIDDEN_KEY]: Boolean(hidden) }); }
