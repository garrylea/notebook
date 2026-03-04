import { create } from 'zustand';

interface AppState {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    user: null | { id: string; username: string; avatar_url: string | null };
    setUser: (user: any) => void;
}

export const useAppStore = create<AppState>()((set) => ({
    theme: 'light',
    setTheme: (theme) => set({ theme }),
    user: null,
    setUser: (user) => set({ user }),
}));
