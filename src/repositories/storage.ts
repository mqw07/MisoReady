export const APP_STATE_STORAGE_KEY = "miso.persistedAppState";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createMemoryStorage(initial: Record<string, string> = {}): StoragePort {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.hasOwn(data, key) ? data[key]! : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
  };
}

/** Browser adapter. This is the only module allowed to touch the Web Storage API. */
export function getStorage(): StoragePort {
  return {
    getItem(key) {
      return globalThis.localStorage.getItem(key);
    },
    setItem(key, value) {
      globalThis.localStorage.setItem(key, value);
    },
  };
}
