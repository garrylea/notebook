import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NoteCard from './NoteCard';
import type { Note } from '../../api/notes';

describe('NoteCard Component', () => {
    const mockNote = {
        id: '1',
        title: 'Test Note Title',
        content: 'This is **bold** and *italic* text.',
        color: 'blue',
        priority: 'high',
        status: 'in_progress',
        is_deleted: 0,
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
        pin_top: 0,
        due_date: null,
        tags: []
    } as Note;

    it('renders note title and priorities correctly', () => {
        render(<NoteCard note={mockNote} onClick={() => { }} />);
        expect(screen.getByText('Test Note Title')).toBeInTheDocument();
        expect(screen.getByText('高优')).toBeInTheDocument();
    });

    it('renders subtask preview correctly', () => {
        const noteWithSubtasks = {
            ...mockNote,
            subtasks: [
                { id: '1', title: 'Task A', is_completed: true },
                { id: '2', title: 'Task B', is_completed: false },
                { id: '3', title: 'Task C', is_completed: false },
                { id: '4', title: 'Task D', is_completed: false },
            ]
        };
        render(<NoteCard note={noteWithSubtasks} onClick={() => { }} />);
        expect(screen.getByText('Task A')).toBeInTheDocument();
        expect(screen.getByText('Task B')).toBeInTheDocument();
        expect(screen.getByText('Task C')).toBeInTheDocument();
        // The 4th should be hidden behind a summary
        expect(screen.queryByText('Task D')).not.toBeInTheDocument();
        expect(screen.getByText('+ 1 个子任务')).toBeInTheDocument();
    });
});
