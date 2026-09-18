# Minimalist Tab

Chrome New Tab extension with independent navigation spaces and local video/image wallpapers.

## Architecture

- `app.js` — application bootstrap and lifecycle hooks.
- `src/config.js` — storage keys, defaults, and media rules.
- `src/storage.js` — persistence, migration from the legacy key, and active space state.
- `src/categories.js` — category/site domain operations; UI code does not mutate data directly.
- `src/wallpaper.js` — media discovery, double-buffer transitions, and playback.
- `src/wallpaper-strategies.js` — wallpaper ordering strategy registry.
- `src/ui.js` — DOM rendering and event wiring.

## Adding a wallpaper ordering strategy

Add a strategy with a `pick(modes)` function in `src/wallpaper-strategies.js`, then use its name from `WallpaperManager.pickNext(name)`. The player does not need to change.

```js
registerWallpaperStrategy("random", {
    label: "🎲",
    title: "Random wallpaper",
    pick(modes) {
        const index = Math.floor(Math.random() * modes.length);
        return Promise.resolve({ mode: modes[index], index });
    }
});
```

The extension has no build step: load the project directory from `chrome://extensions` with Developer mode enabled.

## Keyboard controls

- `S` — switch between the default and private spaces directly.
- `H` — hide or show navigation icons.
- `E` — export website data as JSON.
- `I` — import website data from a validated JSON file.
- `A` — add a new category.
- `1` — sequential wallpaper playback.
- `2` — random wallpaper playback.
- `B` — enter a numbered wallpaper to play it manually.
