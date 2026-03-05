import request from './request';

export interface Note {
    id: string;
    title: string;
    content: string;
    color: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    status: 'draft' | 'in_progress' | 'completed' | 'suspended' | 'archived';
    due_date: string | null;
    tags: string[];
    pin_top: number;
    subtask_total?: number;
    subtask_completed?: number;
    has_attachments?: boolean;
    created_at: string;
    updated_at: string;
}

export interface NotesListResponse {
    total: number;
    page: number;
    limit: number;
    items: Note[];
}

export interface NoteQueryParams {
    page?: number;
    limit?: number;
    keyword?: string;
    status?: string;
    color?: string;
    sort_by?: string;
    start_date?: string;
    end_date?: string;
}

export const getNotes = (params: NoteQueryParams) =>
    request.get<any, NotesListResponse>('/v1/notes', { params });

export const getNoteById = (id: string) =>
    request.get<any, Note>(`/v1/notes/${id}`);

export const createNote = (data: Partial<Note>) =>
    request.post<any, Note>('/v1/notes', data);

export const updateNote = (id: string, data: Partial<Note>) =>
    request.put<any, Note>(`/v1/notes/${id}`, data);

export const updateNoteStatus = (id: string, status: string, remark?: string) =>
    request.patch<any, Note>(`/v1/notes/${id}/status`, { status, remark });

export const deleteNote = (id: string) =>
    request.delete(`/v1/notes/${id}`);

export const restoreNote = (id: string) =>
    request.post(`/v1/notes/${id}/restore`);
