import { create } from 'zustand';
import type { Note, NoteQueryParams } from '../api/notes';
import { getNotes as fetchNotes } from '../api/notes';

interface NoteState {
    notes: Note[];
    total: number;
    loading: boolean;
    page: number;
    hasMore: boolean;
    activeSection: 'active' | 'history' | 'suspended' | 'deleted';
    filters: NoteQueryParams;
    setFilters: (filters: Partial<NoteQueryParams>) => void;
    setActiveSection: (section: NoteState['activeSection']) => void;
    fetchNotes: (reset?: boolean) => Promise<void>;
    appendNotes: () => Promise<void>;
    removeNoteById: (id: string) => void;
    updateNoteInList: (note: Partial<Note> & { id: string }) => void;
}

export const useNoteStore = create<NoteState>()((set, get) => ({
    notes: [],
    total: 0,
    loading: false,
    page: 1,
    hasMore: true,
    activeSection: 'active',
    filters: { limit: 10, sort_by: 'priority_desc,created_at_desc' },

    setFilters: (filters) => {
        set(s => ({ filters: { ...s.filters, ...filters } }));
    },

    setActiveSection: (section) => {
        const statusMap: Record<string, string> = {
            active: 'active',
            history: 'history',
            suspended: 'suspended',
            deleted: 'deleted',
        };
        set({ activeSection: section, notes: [], page: 1, hasMore: true });
        get().setFilters({ status: statusMap[section] });
        get().fetchNotes(true);
    },

    fetchNotes: async (reset = false) => {
        const { filters, page } = get();
        set({ loading: true });
        try {
            const currentPage = reset ? 1 : page;
            const res = await fetchNotes({ ...filters, page: currentPage });
            const newNotes = reset ? res.items : [...get().notes, ...res.items];
            const hasMore = newNotes.length < res.total;
            set({
                notes: newNotes,
                total: res.total,
                page: currentPage,
                hasMore,
                loading: false
            });
        } catch {
            set({ loading: false });
        }
    },

    appendNotes: async () => {
        const { page, hasMore, loading } = get();
        if (!hasMore || loading) return;
        set({ page: page + 1 });
        await get().fetchNotes();
    },

    removeNoteById: (id) => {
        set(s => ({
            notes: s.notes.filter(n => n.id !== id),
            total: s.total - 1
        }));
    },

    updateNoteInList: (partial) => {
        set(s => ({
            notes: s.notes.map(n => n.id === partial.id ? { ...n, ...partial } : n)
        }));
    }
}));
