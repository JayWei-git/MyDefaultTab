import { loadPreferences } from "./preferences.js";
import { createEditor } from "./editor.js";
import { renderNavigation } from "./navigation.js";
import { initializeShortcuts } from "./shortcuts.js";

export function initializeUI(wallpapers) {
    let editor;
    const render = () => renderNavigation({
        onChange: render,
        onEdit: (mode, context) => editor.open(mode, context)
    });

    editor = createEditor(render);
    initializeShortcuts({ editor, onChange: render, wallpapers });
    loadPreferences().then(preferences => {
        document.body.classList.toggle("icons-hidden", Boolean(preferences.icons_hidden));
        document.body.classList.add("preferences-ready");
    });
    render();
}
