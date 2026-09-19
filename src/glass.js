import { createLiquidGlass } from "./vendor/liquid-glass.js";

const BASE_OPTIONS = {
    aberration: [0, 1.5, 3],
    alpha: 1,
    blur: 5,
    displaceBlur: 0,
    fallbackFilter: "none",
    frost: 0,
    lightness: 50,
    saturation: 1
};

function createLens(className, options) {
    const surface = document.createElement("span");
    surface.className = `hover-glass-surface ${className}`;
    surface.setAttribute("aria-hidden", "true");

    let instance = null;
    let target = null;
    let revision = 0;

    function show(nextTarget) {
        if (!nextTarget || target === nextTarget) return;
        target = nextTarget;
        const currentRevision = ++revision;
        nextTarget.prepend(surface);

        requestAnimationFrame(() => {
            if (target !== nextTarget || revision !== currentRevision) return;
            const rect = surface.getBoundingClientRect();
            const config = {
                ...BASE_OPTIONS,
                ...options,
                width: Math.max(1, Math.round(rect.width)),
                height: Math.max(1, Math.round(rect.height))
            };
            if (instance) instance.update(config);
            else instance = createLiquidGlass(surface, config);
            surface.classList.add("is-visible");
        });
    }

    function hide(currentTarget) {
        if (currentTarget && target !== currentTarget) return;
        ++revision;
        target = null;
        surface.classList.remove("is-visible");
    }

    return { show, hide };
}

const tileLens = createLens("hover-glass-tile", {
    border: 0.22,
    borderRadius: 12,
    scale: -34
});

const titleLens = createLens("hover-glass-title", {
    border: 0.26,
    borderRadius: 8,
    scale: -24
});

export function resetGlassInteractions() {
    tileLens.hide();
    titleLens.hide();
}

export function bindGlassInteractions(root) {
    root.querySelectorAll(".site-item, .add-tile").forEach(target => {
        target.addEventListener("pointerenter", () => tileLens.show(target));
        target.addEventListener("pointerleave", () => tileLens.hide(target));
    });

    root.querySelectorAll(".category-block").forEach(block => {
        const title = block.querySelector(".category-title");
        if (!title) return;
        block.addEventListener("pointerenter", () => titleLens.show(title));
        block.addEventListener("pointerleave", () => titleLens.hide(title));
    });
}
