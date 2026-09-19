import { NEW_CATEGORY_SIZE, DEFAULT_CATEGORY_SIZE } from "./config.js";
import { repository, saveSpaces } from "./storage.js";

const activeCategories = () => repository.categories;
const createId = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const positiveInteger = (value, fallback = 1) => Math.max(1, Math.floor(Number(value) || fallback));

const normalizeUrl = url => /^https?:\/\//i.test(url) ? url : `https://${url}`;
export const getCategory = categoryId => activeCategories().find(category => category.id === categoryId);
export const defaultSize = DEFAULT_CATEGORY_SIZE;

export const categories = {
    add(title = "", rows = NEW_CATEGORY_SIZE.rows, columns = NEW_CATEGORY_SIZE.columns) {
        const category = {
            id: createId("cat"),
            title,
            rows: positiveInteger(rows, NEW_CATEGORY_SIZE.rows),
            columns: positiveInteger(columns, NEW_CATEGORY_SIZE.columns),
            items: []
        };
        activeCategories().push(category);
        saveSpaces();
        return category;
    },

    update(categoryId, { title, rows, columns }) {
        const category = getCategory(categoryId);
        if (!category) return false;
        category.title = title;
        category.rows = positiveInteger(rows);
        category.columns = positiveInteger(columns);
        saveSpaces();
        return true;
    },

    remove(categoryId) {
        const index = activeCategories().findIndex(category => category.id === categoryId);
        if (index < 0) return false;
        activeCategories().splice(index, 1);
        saveSpaces();
        return true;
    },

    move(categoryId, targetIndex) {
        const categories = activeCategories();
        const from = categories.findIndex(category => category.id === categoryId);
        if (from < 0) return false;
        const [category] = categories.splice(from, 1);
        const to = Math.max(0, Math.min(targetIndex, categories.length));
        categories.splice(to, 0, category);
        saveSpaces();
        return true;
    },

    addSite(categoryId, name, url) {
        const category = getCategory(categoryId);
        if (!category) return null;
        const site = { id: createId("site"), name, url: normalizeUrl(url) };
        category.items.push(site);
        saveSpaces();
        return site;
    },

    updateSite(categoryId, siteId, name, url) {
        const site = getCategory(categoryId)?.items.find(item => item.id === siteId);
        if (!site) return false;
        Object.assign(site, { name, url: normalizeUrl(url) });
        saveSpaces();
        return true;
    },

    removeSite(categoryId, siteId) {
        const category = getCategory(categoryId);
        if (!category) return false;
        const nextItems = category.items.filter(item => item.id !== siteId);
        if (nextItems.length === category.items.length) return false;
        category.items = nextItems;
        saveSpaces();
        return true;
    },

    reorder(categoryId, siteId, targetId) {
        const category = getCategory(categoryId);
        if (!category || siteId === targetId) return false;
        const from = category.items.findIndex(item => item.id === siteId);
        const to = category.items.findIndex(item => item.id === targetId);
        if (from < 0 || to < 0) return false;
        const [site] = category.items.splice(from, 1);
        category.items.splice(to, 0, site);
        saveSpaces();
        return true;
    }
};
