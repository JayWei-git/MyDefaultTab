import { repository, switchSpace, exportWebsiteData, importWebsiteData } from "./storage.js";
import { categories, getCategory, defaultSize } from "./categories.js";
import { loadPreferences, setIconsHidden } from "./preferences.js";

const $ = selector => document.querySelector(selector);
let edit = null;
let rerender = () => {};

export function render(onChange) {
    rerender = onChange;
    const container = $("#categories-container");
    if (!container) return;
    const previousPositions = new Map([...container.querySelectorAll(".site-item")].map(item => [item.dataset.itemId, item.getBoundingClientRect()]));
    container.innerHTML = "";
    repository.categories.forEach(value => container.appendChild(categoryNode(value)));
    requestAnimationFrame(() => {
        container.querySelectorAll(".site-item").forEach(item => {
            const previous = previousPositions.get(item.dataset.itemId);
            if (!previous) return;
            const current = item.getBoundingClientRect();
            const deltaX = previous.left - current.left;
            const deltaY = previous.top - current.top;
            if (!deltaX && !deltaY) return;
            item.animate([
                { transform: `translate(${deltaX}px, ${deltaY}px)` },
                { transform: "translate(0, 0)" }
            ], { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        });
    });
}

function categoryNode(value) {
    const block = document.createElement("div"); block.className = "category-block"; block.dataset.catId = value.id; block.draggable = true;
    block.ondragstart = event => { if (event.target.closest(".site-item, .add-tile")) return; event.dataTransfer.setData("application/x-category", value.id); block.classList.add("is-category-dragging"); };
    block.ondragend = () => block.classList.remove("is-category-dragging");
    block.ondragover = event => { if (Array.from(event.dataTransfer.types).includes("application/x-category")) event.preventDefault(); };
    block.ondrop = event => { const dragged = event.dataTransfer.getData("application/x-category"); if (!dragged || dragged === value.id) return; event.preventDefault(); categories.move(dragged, repository.categories.findIndex(item => item.id === value.id)); rerender(); };
    const header = document.createElement("div"); header.className = "category-header";
    const title = document.createElement("span"); title.className = "category-title"; title.textContent = value.title || "";
    title.ondblclick = () => openModal("EDIT_CATEGORY", { catId: value.id });
    title.oncontextmenu = event => { event.preventDefault(); openModal("EDIT_CATEGORY", { catId: value.id }); };
    header.appendChild(title); block.appendChild(header);
    const grid = document.createElement("div"); grid.className = "items-grid"; grid.dataset.catId = value.id;
    grid.style.setProperty("--category-columns", Math.max(1, value.columns)); grid.style.setProperty("--category-rows", value.items.length ? Math.max(1, value.rows) : 1);
    value.items.forEach(item => grid.appendChild(siteNode(item, value.id)));
    const add = document.createElement("div"); add.className = "add-tile"; add.title = "Add Site";
    add.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    add.onclick = () => openModal("ADD_SITE", { catId: value.id }); grid.appendChild(add); block.appendChild(grid); return block;
}

function siteNode(item, catId) {
    const link = document.createElement("a"); link.className = "site-item"; link.href = item.url; link.draggable = true; link.dataset.itemId = item.id; link.dataset.catId = catId; link.setAttribute("aria-label", item.name);
    const image = document.createElement("img"); image.className = "site-favicon"; image.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=64`; link.appendChild(image);
    link.oncontextmenu = event => { event.preventDefault(); openModal("EDIT_SITE", { catId, itemId: item.id }); };
    link.ondragstart = event => { event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.setData("application/x-site-category", catId); link.classList.add("is-dragging"); };
    link.ondragend = () => { link.classList.remove("is-dragging"); document.querySelectorAll(".drag-target").forEach(target => target.classList.remove("drag-target")); };
    link.ondragover = event => {
        const dragged = document.querySelector(".site-item.is-dragging");
        if (!dragged || dragged === link || dragged.dataset.catId !== catId) return;
        event.preventDefault(); link.classList.add("drag-target");
    };
    link.ondragleave = () => link.classList.remove("drag-target");
    link.ondrop = event => { const dragged = document.querySelector(".site-item.is-dragging"); if (!dragged || dragged.dataset.catId !== catId) return; event.preventDefault(); link.classList.remove("drag-target"); categories.reorder(catId, dragged.dataset.itemId, item.id); rerender(); }; return link;
}

function openModal(mode, context = {}) {
    edit = { mode, ...context }; $("#modal-overlay").classList.remove("hidden");
    $("#form-site-group").classList.toggle("hidden", !mode.includes("SITE")); $("#form-category-group").classList.toggle("hidden", !mode.includes("CATEGORY")); $("#btn-modal-delete").classList.toggle("hidden", mode.startsWith("ADD"));
    const site = getCategory(context.catId)?.items.find(item => item.id === context.itemId); const cat = getCategory(context.catId);
    $("#modal-title").textContent = mode === "EDIT_CATEGORY" ? "Edit Category" : mode === "ADD_CATEGORY" ? "Add Category" : mode === "ADD_SITE" ? "Add Navigation Link" : "Edit Navigation Link";
    $("#input-site-name").value = site?.name || ""; $("#input-site-url").value = site?.url || ""; $("#input-category-name").value = cat?.title || ""; $("#input-category-rows").value = cat?.rows || defaultSize.rows; $("#input-category-cols").value = cat?.columns || defaultSize.columns;
    setTimeout(() => $(mode.includes("SITE") ? "#input-site-name" : "#input-category-name")?.focus(), 0);
}
function closeModal() { $("#modal-overlay").classList.add("hidden"); edit = null; rerender(); }
function submitModal() {
    if (!edit) return; const name = $("#input-site-name").value.trim(); const url = $("#input-site-url").value.trim();
    if (edit.mode === "ADD_SITE" && name && url) categories.addSite(edit.catId, name, url);
    if (edit.mode === "EDIT_SITE" && name && url) categories.updateSite(edit.catId, edit.itemId, name, url);
    if (edit.mode === "ADD_CATEGORY") { const category = categories.add($("#input-category-name").value.trim()); categories.resize(category.id, $("#input-category-rows").value, $("#input-category-cols").value); }
    if (edit.mode === "EDIT_CATEGORY") { categories.rename(edit.catId, $("#input-category-name").value.trim()); categories.resize(edit.catId, $("#input-category-rows").value, $("#input-category-cols").value); }
    closeModal();
}
function deleteModal() { if (!edit) return; if (edit.mode === "EDIT_SITE") categories.removeSite(edit.catId, edit.itemId); else if (edit.mode === "EDIT_CATEGORY" && confirm("Delete this category and its links?")) categories.remove(edit.catId); closeModal(); }

function showShortcutToast(message) {
    const toast = $("#shortcut-toast"); if (!toast) return;
    toast.textContent = message; toast.classList.add("visible"); clearTimeout(showShortcutToast.timer);
    showShortcutToast.timer = setTimeout(() => toast.classList.remove("visible"), 1800);
}
function downloadWebsiteData() {
    const blob = new Blob([JSON.stringify(exportWebsiteData(), null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `minimalist-tab-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importWebsiteDataFromFile() {
    const input = document.createElement("input"); input.type = "file"; input.accept = "application/json,.json"; input.onchange = async () => { const file = input.files?.[0]; if (!file) return; try { importWebsiteData(JSON.parse(await file.text())); document.body.classList.remove("space-private"); rerender(); showShortcutToast("Website data imported"); } catch (error) { showShortcutToast(`Import failed: ${error.message}`); } }; input.click();
}
function switchSpaceShortcut() {
    const container = $(".container");
    if (container.classList.contains("space-leaving") || container.classList.contains("space-entering")) return;
    container.classList.add("space-leaving");
    setTimeout(() => {
        switchSpace(repository.currentSpace === "default" ? "private" : "default");
        document.body.classList.toggle("space-private", repository.currentSpace === "private");
        rerender();
        container.classList.remove("space-leaving");
        container.classList.add("space-entering");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => container.classList.add("space-entered"));
        });
        setTimeout(() => container.classList.remove("space-entering", "space-entered"), 220);
        showShortcutToast(repository.currentSpace === "private" ? "Switched to Private Space" : "Switched to Default Space");
    }, 180);
}

export function initUI(onChange, wallpaperManager) {
    rerender = onChange; $("#btn-modal-cancel").onclick = closeModal; $("#btn-modal-submit").onclick = submitModal; $("#btn-modal-delete").onclick = deleteModal;
    loadPreferences().then(preferences => { document.body.classList.toggle("icons-hidden", Boolean(preferences.icons_hidden)); document.body.classList.add("preferences-ready"); });
    document.addEventListener("keydown", async event => {
        if (!$("#modal-overlay").classList.contains("hidden")) { if (event.key === "Escape") closeModal(); else if (event.key === "Enter") submitModal(); return; }
        if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) && !event.isComposing) {
            const key = event.key.toLowerCase();
            if (!event.ctrlKey && !event.altKey && !event.metaKey) {
                if (event.key === "1") { wallpaperManager.strategy = "sequential"; chrome.storage.local.set({ wallpaper_strategy: "sequential" }); const pick = await wallpaperManager.pickNext("sequential"); if (pick.mode) await wallpaperManager.set(pick.mode, { persist: false }); showShortcutToast("Switched to Sequential Playback"); return; }
                if (event.key === "2") { wallpaperManager.strategy = "random"; chrome.storage.local.set({ wallpaper_strategy: "random" }); const pick = await wallpaperManager.pickNext("random"); if (pick.mode) await wallpaperManager.set(pick.mode, { persist: false }); showShortcutToast("Switched to Random Playback"); return; }
                if (key === "s") return switchSpaceShortcut();
                if (key === "h") { const hidden = document.body.classList.toggle("icons-hidden"); setIconsHidden(hidden); showShortcutToast(hidden ? "Icons hidden" : "Icons shown"); return; }
                if (key === "e") { downloadWebsiteData(); showShortcutToast("Website data exported"); return; }
                if (key === "i") return importWebsiteDataFromFile();
                if (key === "a") { openModal("ADD_CATEGORY"); return; }
                if (key === "b") { const value = Number.parseInt(prompt(`Enter wallpaper number (1-${wallpaperManager.backgrounds.length}):`), 10); if (Number.isInteger(value) && await wallpaperManager.setByNumber(value)) showShortcutToast(`Wallpaper ${value} selected`); else showShortcutToast("Invalid wallpaper number"); return; }
                if (key === "w") { showShortcutToast(wallpaperManager.currentNumber == null ? "Current wallpaper: unavailable" : `Current wallpaper: ${wallpaperManager.currentNumber}`); return; }
            }
        }
        if ($("#modal-overlay").classList.contains("hidden")) return; if (event.key === "Escape") closeModal(); if (event.key === "Enter") submitModal();
    });
}
