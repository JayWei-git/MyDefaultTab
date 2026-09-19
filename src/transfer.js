import { exportWebsiteData, importWebsiteData } from "./storage.js";

export function downloadWebsiteData() {
    const blob = new Blob([JSON.stringify(exportWebsiteData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `minimalist-tab-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function chooseWebsiteDataFile() {
    return new Promise(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) return resolve({ imported: false });
            try {
                importWebsiteData(JSON.parse(await file.text()));
                resolve({ imported: true });
            } catch (error) {
                resolve({ imported: false, error });
            }
        }, { once: true });
        input.addEventListener("cancel", () => resolve({ imported: false }), { once: true });
        input.click();
    });
}
