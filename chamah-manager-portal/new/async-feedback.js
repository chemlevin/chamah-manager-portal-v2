const activeControls = new WeakSet();

export function loadingMarkup(label) {
  return `<span class="portal-loading-indicator" role="status" aria-live="polite"><span class="portal-loading-spinner" aria-hidden="true"></span><span>${label}</span></span>`;
}

export function setLoadingFeedback(target, active, label = "טוען...") {
  if (!target) return;
  target.hidden = !active;
  target.setAttribute("aria-busy", String(active));
  target.innerHTML = active ? loadingMarkup(label) : "";
}

export async function withBusyControl(control, label, operation) {
  if (!control || activeControls.has(control)) return undefined;
  activeControls.add(control);
  const previous = { disabled: control.disabled, html: control.innerHTML };
  control.disabled = true;
  control.setAttribute("aria-busy", "true");
  control.innerHTML = loadingMarkup(label);
  try {
    return await operation();
  } finally {
    activeControls.delete(control);
    control.disabled = previous.disabled;
    control.removeAttribute("aria-busy");
    control.innerHTML = previous.html;
  }
}
