import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    user: null | { id: string; username: string; avatar_url: string | null };
    setUser: (user: any) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            theme: 'light',
            setTheme: (theme) => set({ theme }),
            user: null,
            setUser: (user) => set({ user }),
        }),
        {
            name: 'app-storage', // name of the item in the storage (must be unique)
            partialize: (state) => ({ user: state.user, theme: state.theme }), // only save user and theme
        }
    )
);
