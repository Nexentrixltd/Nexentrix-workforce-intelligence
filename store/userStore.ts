import { api } from "@/lib/api";
import { LoginResponse, UserStore } from "@/types/stores";
import { create } from "zustand";

type ExtendedUserStore = UserStore & {
  hasFetchedUser: boolean;
  reset: () => void;
};

const getErrorMessage = (err: any): string => {
  return (
    err?.response?.data?.error || 
    err?.response?.data?.message || 
    err.message || 
    "An unexpected error occurred"
  );
};

const initialState = {
  user: null,
  isLoading: false,
  error: null,
  isLoggingOut: false,
  hasFetchedUser: false,
};

export const useUserStore = create<ExtendedUserStore>((set, get) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set(initialState),

  fetchUser: async () => {
    const state = get();
    if (state.isLoading || state.hasFetchedUser) return;

    set({ isLoading: true, error: null });

    try {
      const res = await api.get("/auth/me");
      set({
        user: res.data.user,
        hasFetchedUser: true,
        error: null,
      });
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) {
        set({ user: null, hasFetchedUser: true, error: null });
        return;
      }

      set({
        user: null,
        hasFetchedUser: true,
        error: getErrorMessage(err),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (values) => {
    set({ isLoading: true, error: null });

    try {
      const res = await api.post<LoginResponse>("/auth/login", values);

      if (!res.data.success) {
        set({ error: res.data.message });
        return res.data;
      }
      const me = await api.get("/auth/me");

      set({
        user: me.data.user,
        hasFetchedUser: true,
        error: null,
      });

      return res.data;
    } catch (err: any) {
      set({
        error: getErrorMessage(err),
        hasFetchedUser: true,
      });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoggingOut: true });

    try {
      await api.post("/auth/logout");
      set({ ...initialState, hasFetchedUser: true });
    } catch (err: any) {
      set({ error: getErrorMessage(err) });
      throw err;
    } finally {
      set({ isLoggingOut: false });
    }
  },
}));