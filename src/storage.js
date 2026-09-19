import { STORAGE_KEY, LEGACY_STORAGE_KEY, DEFAULT_SPACES, DEFAULT_CATEGORY_SIZE } from "./config.js";

const clone = value => structuredClone(value);
const chromeGet = keys => new Promise(resolve => chrome.storage.local.get(keys, resolve));
let saveTimer = null;
let dirty = false;

export const repository = {
    spaces: {},
    currentSpace: "default",
    get categories() { return this.spaces[this.currentSpace].categories; }
};

function normalizeSpace(space) {
    space.categories = Array.isArray(space.categories) ? space.categories : [];
    space.categories.forEach(category => {
        category.rows = Math.max(1, Math.floor(Number(category.rows) || DEFAULT_CATEGORY_SIZE.rows));
        category.columns = Math.max(1, Math.floor(Number(category.columns) || DEFAULT_CATEGORY_SIZE.columns));
        category.items = Array.isArray(category.items) ? category.items : [];
        category.title = category.title == null ? "" : String(category.title);
    });
    return space;
}

export function saveSpaces(immediate = false) {
    dirty = true;
    if (immediate) { flushStorage(); return; }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushStorage, 100);
}

export async function loadSpaces() {
    const result = await chromeGet([STORAGE_KEY, LEGACY_STORAGE_KEY]);
    if (result[STORAGE_KEY]?.spaces) repository.spaces = result[STORAGE_KEY].spaces;
    else if (Array.isArray(result[LEGACY_STORAGE_KEY])) {
        repository.spaces = { default: { categories: result[LEGACY_STORAGE_KEY] }, private: { categories: [] } };
        saveSpaces();
    } else { repository.spaces = clone(DEFAULT_SPACES); saveSpaces(); }
    repository.spaces.default = normalizeSpace(repository.spaces.default || { categories: [] });
    repository.spaces.private = normalizeSpace(repository.spaces.private || { categories: [] });
    repository.currentSpace = "default";
}

export function switchSpace(name) {
    if (repository.spaces[name]) repository.currentSpace = name;
}
export function exportWebsiteData() {
    return { format: "minimalist-tab", version: 1, exportedAt: new Date().toISOString(), spaces: structuredClone(repository.spaces) };
}
function isValidImport(data) {
    if (!data || data.format !== "minimalist-tab" || !data.spaces || typeof data.spaces !== "object") return false;
    return ["default", "private"].every(name => data.spaces[name] && Array.isArray(data.spaces[name].categories));
}
export function importWebsiteData(data) {
    if (!isValidImport(data)) throw new Error("Invalid Minimalist Tab JSON data");
    repository.spaces = clone(data.spaces);
    repository.spaces.default = normalizeSpace(repository.spaces.default);
    repository.spaces.private = normalizeSpace(repository.spaces.private);
    repository.currentSpace = "default";
    saveSpaces(true);
}
export function flushStorage() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    if (!dirty) return;
    dirty = false;
    chrome.storage.local.set({ [STORAGE_KEY]: { spaces: repository.spaces } });
}
