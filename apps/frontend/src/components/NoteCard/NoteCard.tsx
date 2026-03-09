import React, { useMemo, useState } from 'react';
import { Tag, Progress, Button, Tooltip, Modal } from 'antd';
import { CheckOutlined, PauseCircleOutlined, DeleteOutlined, ReloadOutlined, PaperClipOutlined, PlayCircleOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { Note } from '../../api/notes';

interface NoteCardProps {
    note: Note;
    onClick: () => void;
    onStart?: () => void;
    onComplete?: () => void;
    onSuspend?: () => void;
    onDelete?: () => void;
    onRestore?: () => void;
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
    onStart,
    onComplete,
    onSuspend,
    onDelete,
    onRestore,
}) => {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewType, setPreviewType] = useState<'image' | 'video' | 'audio' | 'pdf' | 'other'>('other');

    const palette = COLOR_MAP[note.color] || COLOR_MAP.blue;
    const priority = PRIORITY_LABEL[note.priority] || PRIORITY_LABEL.medium;
    const isCompleted = note.status === 'completed' || note.status === 'archived' || note.is_deleted === 1;

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
                {note.status === 'draft' && (
                    <Tag color="default" style={{ border: 'none', borderRadius: 6, fontSize: 11 }}>待开始</Tag>
                )}
                {note.status === 'in_progress' && (
                    <Tag color="cyan" style={{ border: 'none', borderRadius: 6, fontSize: 11 }}>进行中</Tag>
                )}
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
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ node, ...props }) => <span {...props} />, // Prevent block p tags breaking clamp
                        }}
                    >
                        {note.content}
                    </ReactMarkdown>
                </div>
            )}

            {/* Attachment indicator */}
            {note.has_attachments && note.attachments && note.attachments.length > 0 && (
                <div
                    onClick={e => e.stopPropagation()}
                    style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}
                >
                    {note.attachments.map(att => (
                        <div
                            key={att.id}
                            onClick={() => {
                                const url = att.file_path;
                                if (!url) return;
                                const ext = url.split('.').pop()?.toLowerCase() || '';
                                let type: 'image' | 'video' | 'audio' | 'pdf' | 'other' = 'other';
                                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) type = 'image';
                                else if (['mp4', 'webm', 'mov'].includes(ext)) type = 'video';
                                else if (['mp3', 'wav', 'ogg'].includes(ext)) type = 'audio';
                                else if (['pdf'].includes(ext)) type = 'pdf';

                                if (type !== 'other') {
                                    setPreviewType(type);
                                    setPreviewImage(url);
                                    setPreviewOpen(true);
                                } else {
                                    window.open(url, '_blank');
                                }
                            }}
                            style={{
                                fontSize: 11, color: '#1677ff', background: '#e6f4ff',
                                padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4,
                                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}
                        >
                            <PaperClipOutlined />
                            {att.file_name}
                        </div>
                    ))}
                </div>
            )}

            {/* Subtasks Preview */}
            {note.subtasks && note.subtasks.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                    {note.subtasks.slice(0, 3).map((st: any) => (
                        <div key={st.id} style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#555', gap: 6, marginBottom: 2 }}>
                            <div style={{
                                width: 12, height: 12, borderRadius: 2,
                                border: `1px solid ${st.is_completed ? '#52c41a' : '#d9d9d9'}`,
                                background: st.is_completed ? '#52c41a' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {st.is_completed && <CheckOutlined style={{ color: '#fff', fontSize: 8 }} />}
                            </div>
                            <span style={{ textDecoration: st.is_completed ? 'line-through' : 'none', color: st.is_completed ? '#aaa' : 'inherit', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {st.title}
                            </span>
                        </div>
                    ))}
                    {note.subtasks.length > 3 && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                            + {note.subtasks.length - 3} 个子任务
                        </div>
                    )}
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
                {note.status === 'completed' || note.status === 'suspended' || note.status === 'archived' || note.is_deleted === 1 ? (
                    <Tooltip title="重新激活为待开始">
                        <Button size="small" icon={<ReloadOutlined />} onClick={onRestore} type="text" style={{ color: '#6366f1' }}>
                            激活恢复
                        </Button>
                    </Tooltip>
                ) : (
                    <>
                        {note.status === 'draft' ? (
                            <Tooltip title="开始执行">
                                <Button size="small" icon={<PlayCircleOutlined />} onClick={onStart} type="text" style={{ color: '#1677ff' }}>
                                    开始
                                </Button>
                            </Tooltip>
                        ) : (
                            <Tooltip title="标记完成">
                                <Button size="small" icon={<CheckOutlined />} onClick={onComplete} type="text" style={{ color: '#52c41a' }}>
                                    完成
                                </Button>
                            </Tooltip>
                        )}
                        <Tooltip title="挂起此便签">
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

            {/* Media Preview Modal */}
            <Modal
                open={previewOpen}
                footer={null}
                onCancel={(e) => { e.stopPropagation(); setPreviewOpen(false) }}
                destroyOnHidden
                width={previewType === 'pdf' ? '80%' : 520}
                style={{ top: 20 }}
            >
                <div onClick={e => e.stopPropagation()}>
                    {previewType === 'image' && <img alt="preview" style={{ width: '100%' }} src={previewImage} />}
                    {previewType === 'video' && <video controls autoPlay style={{ width: '100%' }} src={previewImage} />}
                    {previewType === 'audio' && <audio controls autoPlay style={{ width: '100%' }} src={previewImage} />}
                    {previewType === 'pdf' && <iframe style={{ width: '100%', height: '80vh', border: 'none' }} src={previewImage} title="PDF Preview" />}
                </div>
            </Modal>
        </div>
    );
};

export default NoteCard;
