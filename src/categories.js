import { NEW_CATEGORY_SIZE, DEFAULT_CATEGORY_SIZE } from "./config.js";
import { repository, saveSpaces } from "./storage.js";

const active = () => repository.categories;
const id = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const category = catId => active().find(item => item.id === catId);

export const categories = {
    add(title = "") { const value = { id: id("cat"), title, ...NEW_CATEGORY_SIZE, items: [] }; active().push(value); saveSpaces(); return value; },
    rename(catId, title) { const value = category(catId); if (value) { value.title = title; saveSpaces(); } },
    resize(catId, rows, columns) { const value = category(catId); if (value) { value.rows = Math.max(1, Math.floor(Number(rows) || 1)); value.columns = Math.max(1, Math.floor(Number(columns) || 1)); saveSpaces(); } },
    remove(catId) { const index = active().findIndex(item => item.id === catId); if (index >= 0) { active().splice(index, 1); saveSpaces(); } },
    move(catId, targetIndex) { const from = active().findIndex(item => item.id === catId); if (from < 0) return; const [value] = active().splice(from, 1); const index = Math.max(0, Math.min(targetIndex, active().length)); active().splice(index, 0, value); saveSpaces(); },
    addSite(catId, name, url) { const value = category(catId); if (!value) return; const item = { id: id("site"), name, url: normalizeUrl(url) }; value.items.push(item); saveSpaces(); return item; },
    updateSite(catId, itemId, name, url) { const item = category(catId)?.items.find(site => site.id === itemId); if (item) { Object.assign(item, { name, url: normalizeUrl(url) }); saveSpaces(); } },
    removeSite(catId, itemId) { const value = category(catId); if (value) { value.items = value.items.filter(item => item.id !== itemId); saveSpaces(); } },
    reorder(catId, itemId, targetId) { const value = category(catId); if (!value || itemId === targetId) return; const from = value.items.findIndex(item => item.id === itemId); const to = value.items.findIndex(item => item.id === targetId); if (from < 0 || to < 0) return; const [item] = value.items.splice(from, 1); value.items.splice(to, 0, item); saveSpaces(); }
};
export const normalizeUrl = url => /^https?:\/\//i.test(url) ? url : `https://${url}`;
export const getCategory = category;
export const defaultSize = DEFAULT_CATEGORY_SIZE;
