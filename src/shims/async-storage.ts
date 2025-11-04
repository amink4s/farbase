/**
 * Lightweight browser shim for @react-native-async-storage/async-storage
 * Used to silence build-time imports from libraries that expect React Native.
 * This shim persists to window.localStorage and implements the basic async API.
 *
 * Note: This is intentionally minimal — it should only be used in web/browser
 * environments where React Native AsyncStorage is not required.
 */

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isBrowser) return Promise.resolve(null);
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isBrowser) return Promise.resolve();
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore quota errors
    }
    return Promise.resolve();
  },

  async removeItem(key: string): Promise<void> {
    if (!isBrowser) return Promise.resolve();
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  },

  async clear(): Promise<void> {
    if (!isBrowser) return Promise.resolve();
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
    return Promise.resolve();
  },

  async getAllKeys(): Promise<string[]> {
    if (!isBrowser) return Promise.resolve([]);
    try {
      return Promise.resolve(Object.keys(window.localStorage));
    } catch {
      return Promise.resolve([]);
    }
  },

  // multiGet/multiSet are convenience helpers used by some libs
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    const result: [string, string | null][] = [];
    for (const k of keys) {
        const v = await AsyncStorage.getItem(k);
      result.push([k, v]);
    }
    return result;
  },

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    for (const [k, v] of keyValuePairs) {
  await AsyncStorage.setItem(k, v);
    }
    return Promise.resolve();
  },
};

export default AsyncStorage;
