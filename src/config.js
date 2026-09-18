export const STORAGE_KEY = "minimal_tab_data";
export const LEGACY_STORAGE_KEY = "typora_tab_data";
export const WALLPAPER_KEY = "user_bg_mode";
export const WALLPAPER_INDEX_KEY = "last_bg_index";
export const WALLPAPER_STRATEGY_KEY = "wallpaper_strategy";
export const ICONS_HIDDEN_KEY = "icons_hidden";
export const DEFAULT_CATEGORY_SIZE = { rows: 4, columns: 8 };
export const NEW_CATEGORY_SIZE = { rows: 4, columns: 2 };
export const DEFAULT_CATEGORIES = [{
    id: "cat_main", title: "", rows: 4, columns: 8,
    items: [
        { id: "site_1", name: "GitHub", url: "https://github.com" },
        { id: "site_2", name: "Gmail", url: "https://mail.google.com" },
        { id: "site_3", name: "Google Scholar", url: "https://scholar.google.com" }
    ]
}];
export const DEFAULT_SPACES = {
    default: { categories: structuredClone(DEFAULT_CATEGORIES) },
    private: { categories: [] }
};

export const MEDIA_EXTENSIONS = /\.(mp4|webm|mkv|avi|mov|jpg|jpeg|png|gif|webp|bmp|svg|avif|ico)$/i;
export const VIDEO_EXTENSIONS = /\.(mp4|webm|mkv|avi|mov)$/i;
export const isVideoFile = name => VIDEO_EXTENSIONS.test(name);
