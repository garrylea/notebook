import React, { useMemo } from 'react';
import { Tag, Progress, Button, Tooltip } from 'antd';
import { CheckOutlined, PauseCircleOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Note } from '../../api/notes';

interface NoteCardProps {
    note: Note;
    onClick: () => void;
    onComplete?: () => void;
    onSuspend?: () => void;
    onDelete?: () => void;
    onRestore?: () => void;
    isHistory?: boolean;
}

const COLOR_MAP: Record<string, { bg: string; bar: string; tag: string }> = {
    red: { bg: '#fff1f0', bar: '#ff4d4f', tag: '#ff4d4f' },
    orange: { bg: '#fff7e6', bar: '#fa8c16', tag: '#fa8c16' },
    blue: { bg: '#e6f4ff', bar: '#1677ff', tag: '#1677ff' },
    green: { bg: '#f6ffed', bar: '#52c41a', tag: '#52c41a' },
    yellow: { bg: '#fffbe6', bar: '#faad14', tag: '#faad14' },
    purple: { bg: '#f9f0ff', bar: '#722ed1', tag: '#722ed1' },
    gray: { bg: '#f5f5f5', bar: '#8c8c8c', tag: '#8c8c8c' },
};

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
    urgent: { label: '紧急', color: '#ff4d4f' },
    high: { label: '高优', color: '#fa8c16' },
    medium: { label: '中等', color: '#1677ff' },
    low: { label: '低优', color: '#52c41a' },
};

const NoteCard: React.FC<NoteCardProps> = ({
    note,
    onClick,
    onComplete,
    onSuspend,
    onDelete,
    onRestore,
    isHistory = false,
}) => {
    const palette = COLOR_MAP[note.color] || COLOR_MAP.blue;
    const priority = PRIORITY_LABEL[note.priority] || PRIORITY_LABEL.medium;
    const isCompleted = note.status === 'completed' || note.status === 'archived';

    const subtaskProgress = useMemo(() => {
        if (!note.subtask_total || note.subtask_total === 0) return null;
        return Math.round(((note.subtask_completed || 0) / note.subtask_total) * 100);
    }, [note.subtask_total, note.subtask_completed]);

    const dueStr = note.due_date
        ? new Date(note.due_date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        : null;

    const isOverdue = note.due_date && new Date(note.due_date) < new Date() && !isCompleted;

    return (
        <div
            onClick={onClick}
            style={{
                background: isCompleted ? '#fafafa' : palette.bg,
                borderRadius: 14,
                padding: '16px 18px',
                marginBottom: 12,
                cursor: 'pointer',
                borderLeft: `4px solid ${palette.bar}`,
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
                opacity: isCompleted ? 0.75 : 1,
                position: 'relative',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'none';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
            }}
        >
            {/* Top row: priority + due date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Tag
                    style={{
                        background: `${priority.color}18`,
                        color: priority.color,
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 11,
                    }}
                >
                    {priority.label}
                </Tag>
                {dueStr && (
                    <span style={{
                        fontSize: 12,
                        color: isOverdue ? '#ff4d4f' : '#8c8c8c',
                        fontWeight: isOverdue ? 600 : 400,
                    }}>
                        {isOverdue ? '⚠ ' : ''}截止 {dueStr}
                    </span>
                )}
            </div>

            {/* Title */}
            <div style={{
                fontWeight: 700,
                fontSize: 15,
                color: '#1a1a2e',
                marginBottom: 6,
                textDecoration: isCompleted ? 'line-through' : 'none',
                lineHeight: 1.4,
            }}>
                {note.title}
            </div>

            {/* Content preview */}
            {note.content && (
                <div style={{
                    fontSize: 13,
                    color: '#666',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginBottom: 10,
                    lineHeight: 1.5,
                }}>
                    {note.content}
                </div>
            )}

            {/* Subtask Progress bar */}
            {subtaskProgress !== null && (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>
                        <span>子任务</span>
                        <span>{note.subtask_completed}/{note.subtask_total}</span>
                    </div>
                    <Progress
                        percent={subtaskProgress}
                        showInfo={false}
                        strokeColor={palette.bar}
                        size={['100%', 4]}
                        style={{ margin: 0 }}
                    />
                </div>
            )}

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
                <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {note.tags.map(t => (
                        <Tag key={t} style={{ fontSize: 11, borderRadius: 4, background: 'rgba(0,0,0,0.04)', border: 'none' }}>
                            {t}
                        </Tag>
                    ))}
                </div>
            )}

            {/* Bottom actions */}
            <div
                onClick={e => e.stopPropagation()}
                style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 10 }}
            >
                {isHistory ? (
                    <Tooltip title="重新激活">
                        <Button size="small" icon={<ReloadOutlined />} onClick={onRestore} type="text" style={{ color: '#6366f1' }}>
                            激活
                        </Button>
                    </Tooltip>
                ) : (
                    <>
                        <Tooltip title="标记完成">
                            <Button size="small" icon={<CheckOutlined />} onClick={onComplete} type="text" style={{ color: '#52c41a' }}>
                                完成
                            </Button>
                        </Tooltip>
                        <Tooltip title="挂起">
                            <Button size="small" icon={<PauseCircleOutlined />} onClick={onSuspend} type="text" style={{ color: '#fa8c16' }}>
                                挂起
                            </Button>
                        </Tooltip>
                        <Tooltip title="移入回收站">
                            <Button size="small" icon={<DeleteOutlined />} onClick={onDelete} type="text" danger>
                                删除
                            </Button>
                        </Tooltip>
                    </>
                )}
            </div>
        </div>
    );
};

export default NoteCard;
