const toast = document.querySelector("#shortcut-toast");
let hideTimer = null;

export function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
}
