import test from "node:test";
import assert from "node:assert/strict";
import { createAutosave, readAutosaveDraft, AUTOSAVE_STATUS } from "../chamah-manager-portal/new/autosave.js";

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test("shared autosave controller", async (suite) => {
  suite.beforeEach(() => {
    const values = new Map();
    globalThis.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
  });

  suite.afterEach(() => { delete globalThis.localStorage; });

  await suite.test("debounces edits, persists drafts, and clears them after save", async () => {
    let value = { notes: "draft" };
    const saved = [];
    const controller = createAutosave({ key: "idle", read: () => value, save: async (row) => saved.push(row), delay: 15 });
    controller.markDirty();
    assert.equal(controller.getStatus(), AUTOSAVE_STATUS.UNSAVED);
    assert.deepEqual(readAutosaveDraft("idle"), value);
    await pause(30);
    assert.deepEqual(saved, [value]);
    assert.equal(controller.getStatus(), AUTOSAVE_STATUS.SAVED);
    assert.equal(readAutosaveDraft("idle"), null);
    controller.destroy();
  });

  await suite.test("saves immediate changes without running invalid drafts", async () => {
    let value = { complete: false };
    let saves = 0;
    const controller = createAutosave({ key: "valid", read: () => value, validate: (row) => row.complete, save: async () => { saves += 1; }, delay: 50 });
    controller.markDirty({ immediate: true });
    await pause(10);
    assert.equal(saves, 0);
    value = { complete: true };
    controller.markDirty({ immediate: true });
    await pause(10);
    assert.equal(saves, 1);
    controller.destroy();
  });

  await suite.test("serializes concurrent saves and retries failures", async () => {
    let value = { revision: 1 };
    let calls = 0;
    let release;
    const first = new Promise((resolve) => { release = resolve; });
    const controller = createAutosave({
      key: "serialized",
      read: () => value,
      delay: 5,
      retryDelay: 10,
      save: async () => {
        calls += 1;
        if (calls === 1) await first;
        if (calls === 2) throw new Error("temporary");
      },
    });
    controller.markDirty({ immediate: true });
    await pause(5);
    value = { revision: 2 };
    controller.markDirty({ immediate: true });
    assert.equal(calls, 1);
    release();
    await pause(35);
    assert.equal(calls, 3);
    assert.equal(controller.getStatus(), AUTOSAVE_STATUS.SAVED);
    controller.destroy();
  });
});
