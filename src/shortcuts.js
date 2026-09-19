import { repository, switchSpace } from "./storage.js";
import { setIconsHidden } from "./preferences.js";
import { downloadWebsiteData, chooseWebsiteDataFile } from "./transfer.js";
import { showToast } from "./toast.js";

const isTextInput = target => target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target?.isContentEditable;

function switchSpaceWithAnimation(onChange) {
    const container = document.querySelector(".container");
    if (!container || container.classList.contains("space-leaving") || container.classList.contains("space-entering")) return;
    container.classList.add("space-leaving");
    setTimeout(() => {
        switchSpace(repository.currentSpace === "default" ? "private" : "default");
        document.body.classList.toggle("space-private", repository.currentSpace === "private");
        onChange();
        container.classList.remove("space-leaving");
        container.classList.add("space-entering");
        requestAnimationFrame(() => requestAnimationFrame(() => container.classList.add("space-entered")));
        setTimeout(() => container.classList.remove("space-entering", "space-entered"), 220);
        showToast(repository.currentSpace === "private" ? "Switched to Private Space" : "Switched to Default Space");
    }, 180);
}

async function selectWallpaper(wallpapers) {
    const value = Number.parseInt(prompt(`Enter wallpaper number (${wallpapers.numberHint}):`), 10);
    if (Number.isInteger(value) && await wallpapers.setByNumber(value)) showToast(`Wallpaper ${value} selected`);
    else showToast("Invalid wallpaper number");
}

export function initializeShortcuts({ editor, onChange, wallpapers }) {
    document.addEventListener("keydown", async event => {
        if (editor.isOpen()) {
            editor.handleKeydown(event);
            return;
        }
        if (isTextInput(event.target) || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;

        const key = event.key.toLowerCase();
        if (key === "1" || key === "2") {
            const strategy = key === "1" ? "sequential" : "random";
            await wallpapers.setStrategy(strategy);
            showToast(strategy === "sequential" ? "Switched to Sequential Playback" : "Switched to Random Playback");
        } else if (key === "s") {
            switchSpaceWithAnimation(onChange);
        } else if (key === "h") {
            const hidden = document.body.classList.toggle("icons-hidden");
            setIconsHidden(hidden);
            showToast(hidden ? "Icons hidden" : "Icons shown");
        } else if (key === "e") {
            downloadWebsiteData();
            showToast("Website data exported");
        } else if (key === "i") {
            const result = await chooseWebsiteDataFile();
            if (result.imported) {
                document.body.classList.remove("space-private");
                onChange();
                showToast("Website data imported");
            } else if (result.error) {
                showToast(`Import failed: ${result.error.message}`);
            }
        } else if (key === "a") {
            editor.open("ADD_CATEGORY");
        } else if (key === "b") {
            await selectWallpaper(wallpapers);
        } else if (key === "w") {
            showToast(wallpapers.currentNumber == null ? "Current wallpaper: unavailable" : `Current wallpaper: ${wallpapers.currentNumber}`);
        } else if (key === "f") {
            const fixed = await wallpapers.toggleFixed();
            showToast(fixed ? "Wallpaper fixed" : "Wallpaper unfixed");
        }
    });
}
