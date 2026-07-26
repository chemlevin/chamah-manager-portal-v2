export const AUTOSAVE_STATUS = Object.freeze({
  UNSAVED: "unsaved",
  SAVING: "saving",
  SAVED: "saved",
  FAILED: "failed",
});

const labels = {
  [AUTOSAVE_STATUS.UNSAVED]: "לא נשמר",
  [AUTOSAVE_STATUS.SAVING]: "שומר…",
  [AUTOSAVE_STATUS.SAVED]: "נשמר",
  [AUTOSAVE_STATUS.FAILED]: "השמירה נכשלה",
};
const active = new Set();
let warningInstalled = false;

const storageKey = (key) => `chamah.autosave.${key}`;
const safeStorage = {
  get(key) {
    try { return JSON.parse(globalThis.localStorage?.getItem(storageKey(key))); } catch { return null; }
  },
  set(key, value) {
    try { globalThis.localStorage?.setItem(storageKey(key), JSON.stringify({ value, savedAt: Date.now() })); } catch { /* storage is best effort */ }
  },
  remove(key) {
    try { globalThis.localStorage?.removeItem(storageKey(key)); } catch { /* storage is best effort */ }
  },
};

function installWarning() {
  if (warningInstalled || typeof window === "undefined") return;
  warningInstalled = true;
  window.addEventListener("beforeunload", (event) => {
    if (![...active].some((controller) => controller.hasUnsavedChanges())) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

export function readAutosaveDraft(key) {
  return safeStorage.get(key)?.value ?? null;
}

export function createAutosave({
  key,
  read,
  save,
  validate = () => true,
  statusTargets = () => [],
  delay = 1500,
  retryDelay = 3000,
  onSaved = () => {},
}) {
  installWarning();
  let status = AUTOSAVE_STATUS.SAVED;
  let timer = null;
  let retryTimer = null;
  let inFlight = null;
  let queued = false;
  let destroyed = false;

  const targets = () => {
    const value = typeof statusTargets === "function" ? statusTargets() : statusTargets;
    return value ? [...value] : [];
  };
  const setStatus = (next) => {
    status = next;
    for (const node of targets()) {
      node.dataset.autosaveState = next;
      node.textContent = labels[next];
      node.setAttribute("aria-label", `מצב שמירה: ${labels[next]}`);
    }
  };
  const valid = (value) => {
    try { return validate(value) === true; } catch { return false; }
  };
  const persist = (value) => safeStorage.set(key, value);
  const clearTimers = () => {
    clearTimeout(timer);
    clearTimeout(retryTimer);
    timer = retryTimer = null;
  };

  const saveNow = async ({ manual = false } = {}) => {
    clearTimeout(timer);
    timer = null;
    const value = read();
    persist(value);
    if (!valid(value)) {
      setStatus(AUTOSAVE_STATUS.UNSAVED);
      if (manual) throw new Error("הנתונים אינם תקינים או שהפיצול אינו שלם.");
      return false;
    }
    if (inFlight) {
      queued = true;
      return inFlight;
    }
    setStatus(AUTOSAVE_STATUS.SAVING);
    inFlight = Promise.resolve().then(() => save(value));
    try {
      const result = await inFlight;
      safeStorage.remove(key);
      setStatus(AUTOSAVE_STATUS.SAVED);
      await onSaved(result, value, { manual });
      return true;
    } catch (error) {
      setStatus(AUTOSAVE_STATUS.FAILED);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { if (!destroyed) void saveNow(); }, retryDelay);
      if (manual) throw error;
      return false;
    } finally {
      inFlight = null;
      if (queued && !destroyed) {
        queued = false;
        void saveNow();
      }
    }
  };

  const markDirty = ({ immediate = false } = {}) => {
    const value = read();
    persist(value);
    setStatus(AUTOSAVE_STATUS.UNSAVED);
    clearTimeout(timer);
    if (valid(value)) timer = setTimeout(() => void saveNow(), immediate ? 0 : delay);
  };

  const controller = {
    markDirty,
    saveNow,
    getStatus: () => status,
    hasUnsavedChanges: () => [AUTOSAVE_STATUS.UNSAVED, AUTOSAVE_STATUS.SAVING, AUTOSAVE_STATUS.FAILED].includes(status),
    clear() { clearTimers(); safeStorage.remove(key); setStatus(AUTOSAVE_STATUS.SAVED); },
    destroy() { destroyed = true; clearTimers(); active.delete(controller); },
  };
  active.add(controller);
  setStatus(status);
  return controller;
}

export function bindFormAutosave({
  form,
  key,
  save,
  onSaved,
  delay,
  retryDelay,
  restore = true,
  closeOnManual = false,
}) {
  const read = () => Object.fromEntries(new FormData(form));
  if (restore) {
    const draft = readAutosaveDraft(key);
    if (draft) {
      for (const [name, value] of Object.entries(draft)) {
        const field = form.elements.namedItem(name);
        if (field && typeof field.value === "string") field.value = value ?? "";
      }
    }
  }
  const status = document.createElement("span");
  status.className = "autosave-status";
  status.setAttribute("role", "status");
  form.querySelector(".dialog-actions")?.prepend(status);
  const controller = createAutosave({
    key,
    read,
    save,
    validate: () => form.checkValidity(),
    statusTargets: [status],
    delay,
    retryDelay,
    onSaved,
  });
  form.addEventListener("input", () => controller.markDirty());
  form.addEventListener("change", (event) => controller.markDirty({ immediate: event.target.matches("select,input[type=date],input[type=month]") }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await controller.saveNow({ manual: true });
      if (closeOnManual) form.closest("dialog")?.close();
    } catch { form.reportValidity(); }
  });
  return controller;
}
