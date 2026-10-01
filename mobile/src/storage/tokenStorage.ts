import * as SecureStore from 'expo-secure-store';

const KEY = 'padosipro_token';

// The JWT lives in the OS keychain/keystore (not AsyncStorage), and survives app restarts.
export const tokenStorage = {
  get: async () => {
    try {
      return await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: async () => {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      /* nothing to clear */
    }
  },
};
