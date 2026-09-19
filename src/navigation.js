import { repository } from "./storage.js";
import { categories } from "./categories.js";
import { bindGlassInteractions, resetGlassInteractions } from "./glass.js";

const FAVICON_SIZE = 64;

function animateReorder(container, previousPositions) {
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

function createSiteNode(item, categoryId, onChange, onEdit) {
    const link = document.createElement("a");
    link.className = "site-item";
    link.href = item.url;
    link.draggable = true;
    link.dataset.itemId = item.id;
    link.dataset.catId = categoryId;
    link.setAttribute("aria-label", item.name);

    const image = document.createElement("img");
    image.className = "site-favicon";
    image.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=${FAVICON_SIZE}`;
    link.appendChild(image);

    link.addEventListener("contextmenu", event => {
        event.preventDefault();
        onEdit("EDIT_SITE", { catId: categoryId, itemId: item.id });
    });
    link.addEventListener("dragstart", event => {
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.setData("application/x-site-category", categoryId);
        event.dataTransfer.effectAllowed = "move";
        link.classList.add("is-dragging");
    });
    link.addEventListener("dragend", () => {
        link.classList.remove("is-dragging");
        document.querySelectorAll(".drag-target").forEach(target => target.classList.remove("drag-target"));
    });
    link.addEventListener("dragover", event => {
        const dragged = document.querySelector(".site-item.is-dragging");
        if (!dragged || dragged === link || dragged.dataset.catId !== categoryId) return;
        event.preventDefault();
        link.classList.add("drag-target");
    });
    link.addEventListener("dragleave", () => link.classList.remove("drag-target"));
    link.addEventListener("drop", event => {
        const dragged = document.querySelector(".site-item.is-dragging");
        if (!dragged || dragged.dataset.catId !== categoryId) return;
        event.preventDefault();
        link.classList.remove("drag-target");
        categories.reorder(categoryId, dragged.dataset.itemId, item.id);
        onChange();
    });
    return link;
}

function createCategoryNode(category, onChange, onEdit) {
    const block = document.createElement("div");
    block.className = "category-block";
    block.dataset.catId = category.id;
    block.draggable = true;

    block.addEventListener("dragstart", event => {
        if (event.target.closest(".site-item, .add-tile")) return;
        event.dataTransfer.setData("application/x-category", category.id);
        event.dataTransfer.effectAllowed = "move";
        block.classList.add("is-category-dragging");
    });
    block.addEventListener("dragend", () => block.classList.remove("is-category-dragging"));
    block.addEventListener("dragover", event => {
        if (Array.from(event.dataTransfer.types).includes("application/x-category")) event.preventDefault();
    });
    block.addEventListener("drop", event => {
        const draggedId = event.dataTransfer.getData("application/x-category");
        if (!draggedId || draggedId === category.id) return;
        event.preventDefault();
        categories.move(draggedId, repository.categories.findIndex(item => item.id === category.id));
        onChange();
    });

    const header = document.createElement("div");
    header.className = "category-header";
    const title = document.createElement("span");
    title.className = "category-title";
    const titleLabel = document.createElement("span");
    titleLabel.className = "category-title-label";
    titleLabel.textContent = category.title || "";
    title.appendChild(titleLabel);
    const editCategory = event => {
        event?.preventDefault();
        onEdit("EDIT_CATEGORY", { catId: category.id });
    };
    title.addEventListener("dblclick", editCategory);
    title.addEventListener("contextmenu", editCategory);
    header.appendChild(title);
    block.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "items-grid";
    grid.dataset.catId = category.id;
    grid.style.setProperty("--category-columns", Math.max(1, category.columns));
    grid.style.setProperty("--category-rows", category.items.length ? Math.max(1, category.rows) : 1);
    category.items.forEach(item => grid.appendChild(createSiteNode(item, category.id, onChange, onEdit)));

    const add = document.createElement("div");
    add.className = "add-tile";
    add.title = "Add Site";
    add.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    add.addEventListener("click", () => onEdit("ADD_SITE", { catId: category.id }));
    grid.appendChild(add);
    block.appendChild(grid);
    return block;
}

export function renderNavigation({ onChange, onEdit }) {
    const container = document.querySelector("#categories-container");
    if (!container) return;
    const previousPositions = new Map(
        [...container.querySelectorAll(".site-item")].map(item => [item.dataset.itemId, item.getBoundingClientRect()])
    );

    resetGlassInteractions();
    const fragment = document.createDocumentFragment();
    repository.categories.forEach(category => fragment.appendChild(createCategoryNode(category, onChange, onEdit)));
    container.replaceChildren(fragment);
    bindGlassInteractions(container);
    animateReorder(container, previousPositions);
}
