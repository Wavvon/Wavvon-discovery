// The site's only script: the copy buttons rendered by CopyButton.tsx.
document.addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-copy]") : null;
  if (!button) return;
  const label = button.querySelector("[data-copy-label]");
  try {
    await navigator.clipboard.writeText(button.getAttribute("data-copy") ?? "");
  } catch {
    // Clipboard blocked (insecure origin, denied permission). The value is
    // on screen either way, so say nothing and let the reader select it.
    return;
  }
  if (!label) return;
  const original = label.dataset.original ?? label.textContent;
  label.dataset.original = original;
  label.textContent = "copied";
  setTimeout(() => (label.textContent = original), 2000);
});
