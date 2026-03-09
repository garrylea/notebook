import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NoteDrawer from './NoteDrawer';
import * as notesApi from '../../api/notes';

vi.mock('../../api/notes', () => ({
    getNoteById: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn()
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('NoteDrawer Component', () => {
    it('renders correctly for creating a new note', () => {
        render(<NoteDrawer open={true} onClose={() => { }} onSaved={() => { }} />);
        expect(screen.getByText('✨ 新建便签')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('准备做什么？')).toBeInTheDocument();
    });

    it('shows preview button and toggles preview mode', async () => {
        render(<NoteDrawer open={true} onClose={() => { }} onSaved={() => { }} />);
        const previewBtn = screen.getByText('预览');
        expect(previewBtn).toBeInTheDocument();

        // click preview
        fireEvent.click(previewBtn);

        // should show edit button
        expect(screen.getByText('编辑')).toBeInTheDocument();
    });

    it('loads existing note with attachments and handles preview types correctly', async () => {
        vi.mocked(notesApi.getNoteById).mockResolvedValueOnce({
            id: '123',
            title: 'Test Note',
            color: 'blue',
            priority: 'medium',
            content: 'Hello',
            status: 'in_progress',
            attachments: [
                { id: 'att1', file_name: 'test.jpg', file_path: '/uploads/test.jpg', file_size: 1000 },
                { id: 'att2', file_name: 'test.mp4', file_path: '/uploads/test.mp4', file_size: 2000 }
            ],
            subtasks: []
        } as any);

        render(<NoteDrawer open={true} noteId="123" onClose={() => { }} onSaved={() => { }} />);

        await waitFor(() => {
            expect(screen.getByText('📝 编辑便签')).toBeInTheDocument();
        });

        // Check if attachments loaded
        expect(screen.getByText('拖拽文件到此处 或 点击上传')).toBeInTheDocument();

        // The Upload component should render the file names
        await waitFor(() => {
            expect(screen.getByText('test.jpg')).toBeInTheDocument();
            expect(screen.getByText('test.mp4')).toBeInTheDocument();
        });
    });
});
