// Node has no usable localStorage; give zustand's persist middleware an in-memory one.
const memory = new Map<string, string>();
const storage: Storage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, String(v)),
  removeItem: (k) => void memory.delete(k),
  clear: () => memory.clear(),
  key: (i) => [...memory.keys()][i] ?? null,
  get length() {
    return memory.size;
  },
};
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
// zustand's persist middleware reads window.localStorage.
if (typeof window === 'undefined') Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
