/**
 * Copies one string. The whole flow for adding an app is "copy this key, paste
 * it into your hub", so this is a load-bearing control rather than a nicety.
 *
 * Rendered on the server; public/copy.js wires every `data-copy` button. */
export function CopyButton({
  value,
  label = "copy",
  variant = "ghost",
}: {
  value: string;
  label?: string;
  variant?: "ghost" | "primary";
}) {
  const primary = variant === "primary";
  return (
    <button
      type="button"
      data-copy={value}
      aria-live="polite"
      className={
        primary
          ? "flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
          : "inline-flex shrink-0 items-center gap-1.5 rounded border border-border px-2 py-1 font-mono text-[11px] text-text-muted transition-colors hover:border-border-strong hover:text-text"
      }
    >
      <svg
        width={primary ? 15 : 11}
        height={primary ? 15 : 11}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5V4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
      </svg>
      <span data-copy-label>{label}</span>
    </button>
  );
}
