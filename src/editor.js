import { categories, getCategory, defaultSize } from "./categories.js";

const TITLES = {
    ADD_CATEGORY: "Add Category",
    ADD_SITE: "Add Navigation Link",
    EDIT_CATEGORY: "Edit Category",
    EDIT_SITE: "Edit Navigation Link"
};

export function createEditor(onChange) {
    const elements = {
        overlay: document.querySelector("#modal-overlay"),
        title: document.querySelector("#modal-title"),
        siteGroup: document.querySelector("#form-site-group"),
        categoryGroup: document.querySelector("#form-category-group"),
        siteName: document.querySelector("#input-site-name"),
        siteUrl: document.querySelector("#input-site-url"),
        categoryName: document.querySelector("#input-category-name"),
        categoryRows: document.querySelector("#input-category-rows"),
        categoryColumns: document.querySelector("#input-category-cols"),
        cancel: document.querySelector("#btn-modal-cancel"),
        submit: document.querySelector("#btn-modal-submit"),
        remove: document.querySelector("#btn-modal-delete")
    };
    let state = null;

    function close(changed = false) {
        elements.overlay.classList.add("hidden");
        state = null;
        if (changed) onChange();
    }

    function open(mode, context = {}) {
        state = { mode, ...context };
        const category = getCategory(context.catId);
        const site = category?.items.find(item => item.id === context.itemId);
        const isSite = mode.includes("SITE");

        elements.overlay.classList.remove("hidden");
        elements.siteGroup.classList.toggle("hidden", !isSite);
        elements.categoryGroup.classList.toggle("hidden", isSite);
        elements.remove.classList.toggle("hidden", mode.startsWith("ADD"));
        elements.title.textContent = TITLES[mode] || "Edit";
        elements.siteName.value = site?.name || "";
        elements.siteUrl.value = site?.url || "";
        elements.categoryName.value = category?.title || "";
        elements.categoryRows.value = category?.rows || defaultSize.rows;
        elements.categoryColumns.value = category?.columns || defaultSize.columns;
        requestAnimationFrame(() => (isSite ? elements.siteName : elements.categoryName).focus());
    }

    function submit() {
        if (!state) return;
        const name = elements.siteName.value.trim();
        const url = elements.siteUrl.value.trim();
        let changed = false;

        if (state.mode === "ADD_SITE" && name && url) {
            categories.addSite(state.catId, name, url);
            changed = true;
        } else if (state.mode === "EDIT_SITE" && name && url) {
            categories.updateSite(state.catId, state.itemId, name, url);
            changed = true;
        } else if (state.mode === "ADD_CATEGORY") {
            categories.add(
                elements.categoryName.value.trim(),
                elements.categoryRows.value,
                elements.categoryColumns.value
            );
            changed = true;
        } else if (state.mode === "EDIT_CATEGORY") {
            categories.update(state.catId, {
                title: elements.categoryName.value.trim(),
                rows: elements.categoryRows.value,
                columns: elements.categoryColumns.value
            });
            changed = true;
        }
        close(changed);
    }

    function remove() {
        if (!state) return;
        if (state.mode === "EDIT_SITE") {
            categories.removeSite(state.catId, state.itemId);
            close(true);
        } else if (state.mode === "EDIT_CATEGORY" && confirm("Delete this category and its links?")) {
            categories.remove(state.catId);
            close(true);
        }
    }

    elements.cancel.addEventListener("click", () => close());
    elements.submit.addEventListener("click", submit);
    elements.remove.addEventListener("click", remove);

    return {
        open,
        isOpen: () => !elements.overlay.classList.contains("hidden"),
        handleKeydown(event) {
            if (event.key === "Escape") close();
            else if (event.key === "Enter") submit();
        }
    };
}
