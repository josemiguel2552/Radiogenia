export function copyToClipboard(text: string): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallback(text));
  } else {
    fallback(text);
  }
}

function fallback(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}
