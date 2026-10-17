import type { User } from "../types";
let currentUser: User | null = null;
const listeners = new Set<(user: User | null) => void>();
export const authStore = {
  getUser: () => currentUser,
  setUser: (user: User | null) => {
    currentUser = user;
    listeners.forEach((listener) => listener(currentUser));
  },
  subscribe: (listener: (user: User | null) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
