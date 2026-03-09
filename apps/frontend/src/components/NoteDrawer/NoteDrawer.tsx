import React, { useEffect, useState } from 'react';
import {
    Drawer, Form, Input, Select, DatePicker, Button, Divider,
    Checkbox, Tooltip, Space, Upload, Typography, Spin, message, Modal
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
    PlusOutlined, DeleteOutlined, SaveOutlined, UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Note } from '../../api/notes';
import * as notesApi from '../../api/notes';
import request from '../../api/request';

import DOMPurify from 'dompurify';
import { marked } from 'marked';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render.mjs';

const { TextArea } = Input;
const { Text } = Typography;

interface NoteDrawerProps {
    open: boolean;
    noteId?: string | null;
    onClose: () => void;
    onSaved: (note: Note) => void;
}

const COLOR_OPTIONS = [
    { value: 'red', label: '🔴 紧急-红' },
    { value: 'orange', label: '🟠 重要-橙' },
    { value: 'blue', label: '🔵 常规-蓝' },
    { value: 'green', label: '🟢 低优-绿' },
    { value: 'yellow', label: '🟡 提示-黄' },
    { value: 'purple', label: '🟣 特别-紫' },
    { value: 'gray', label: '⚫ 归档-灰' },
];

const PRIORITY_OPTIONS = [
    { value: 'urgent', label: '🔥 紧急' },
    { value: 'high', label: '⬆ 高优' },
    { value: 'medium', label: '➡ 中等' },
    { value: 'low', label: '⬇ 低优' },
];

const NoteDrawer: React.FC<NoteDrawerProps> = ({ open, noteId, onClose, onSaved }) => {
    const [form] = Form.useForm();
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [subtasks, setSubtasks] = useState<any[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [previewMode, setPreviewMode] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewType, setPreviewType] = useState<'image' | 'video' | 'audio' | 'pdf' | 'other'>('other');
    const contentRef = React.useRef<HTMLDivElement>(null);
    const isNew = !noteId;

    // Load note details when opening
    useEffect(() => {
        if (!open) return;
        if (isNew) {
            form.resetFields();
            setNote(null);
            setSubtasks([]);
            setPreviewMode(false);
            setFileList([]);
            setDirty(false);
            return;
        }
        setLoading(true);
        notesApi.getNoteById(noteId!).then(data => {
            setNote(data as any);
            setSubtasks((data as any).subtasks || []);
            setFileList(((data as any).attachments || []).map((att: any) => ({
                uid: att.id,
                name: att.file_name,
                status: 'done',
                url: att.file_path,
                size: att.file_size
            })));
            form.setFieldsValue({
                title: data.title,
                color: data.color,
                priority: data.priority,
                content: data.content,
                due_date: data.due_date ? dayjs(data.due_date) : null,
                tags: data.tags,
            });
            setDirty(false);
        }).finally(() => setLoading(false));
    }, [open, noteId]);

    useEffect(() => {
        if (previewMode && contentRef.current) {
            renderMathInElement(contentRef.current, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        }
    }, [previewMode, form.getFieldValue('content')]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = {
                ...values,
                due_date: values.due_date ? values.due_date.toISOString() : null,
                tags: values.tags || [],
            };
            let saved: Note;
            if (isNew) {
                saved = await notesApi.createNote(payload);
            } else {
                saved = await notesApi.updateNote(noteId!, payload);
            }
            onSaved(saved);
            setDirty(false);
            onClose();
        } catch (e) {
            // validation error caught by antd
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (dirty) {
            if (window.confirm('有未保存的更改，确认离开吗？')) {
                setDirty(false);
                onClose();
            }
        } else {
            onClose();
        }
    };

    const handleAddSubtask = async () => {
        if (!newSubtaskTitle.trim() || !note) return;
        const result: any = await request.post(`/v1/notes/${note.id}/subtasks`, { title: newSubtaskTitle });
        setSubtasks(prev => [...prev, result]);
        setNewSubtaskTitle('');
    };

    const handleToggleSubtask = async (subtask: any) => {
        if (!note) return;
        const newStatus = subtask.is_completed ? 'pending' : 'completed';
        await request.put(`/v1/notes/${note.id}/subtasks/${subtask.id}`, { status: newStatus });
        setSubtasks(prev => prev.map(s => s.id === subtask.id
            ? { ...s, is_completed: !s.is_completed, status: newStatus }
            : s
        ));
    };

    return (
        <Drawer
            title={
                <Space>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                        {isNew ? '✨ 新建便签' : '📝 编辑便签'}
                    </span>
                </Space>
            }
            placement="right"
            size="large"
            open={open}
            onClose={handleClose}
            extra={
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSave}
                    style={{ background: '#6366f1', borderColor: '#6366f1' }}
                >
                    保存
                </Button>
            }
            styles={{
                header: { borderBottom: '1px solid #f0f0f0' },
                body: { padding: '20px 24px' }
            }}
        >
            {loading && <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>}

            <Form
                form={form}
                layout="vertical"
                onValuesChange={() => setDirty(true)}
                initialValues={{ color: 'blue', priority: 'medium' }}
                style={{ display: loading ? 'none' : 'block' }}
            >
                {/* Color & Priority Row */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 0 }}>
                    <Form.Item name="color" label="颜色" style={{ flex: 1 }} rules={[{ required: true }]}>
                        <Select options={COLOR_OPTIONS} />
                    </Form.Item>
                    <Form.Item name="priority" label="优先级" style={{ flex: 1 }}>
                        <Select options={PRIORITY_OPTIONS} />
                    </Form.Item>
                </div>

                {/* Title */}
                <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                    <Input placeholder="准备做什么？" style={{ fontWeight: 600, fontSize: 15 }} />
                </Form.Item>

                {/* Due date */}
                <Form.Item name="due_date" label="截止日期">
                    <DatePicker
                        showTime
                        style={{ width: '100%' }}
                        placeholder="选择截止日期（选填）"
                        format="YYYY-MM-DD HH:mm"
                    />
                </Form.Item>

                {/* Tags */}
                <Form.Item name="tags" label="标签">
                    <Select mode="tags" placeholder="输入标签后回车" style={{ width: '100%' }} />
                </Form.Item>

                {/* Content */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>正文</span>
                    <Button
                        type="link"
                        size="small"
                        onClick={() => setPreviewMode(!previewMode)}
                    >
                        {previewMode ? '编辑' : '预览'}
                    </Button>
                </div>
                {previewMode ? (
                    <div
                        ref={contentRef}
                        style={{
                            padding: '8px 11px',
                            background: '#f5f5f5',
                            borderRadius: 6,
                            minHeight: 98,
                            marginBottom: 24,
                            fontSize: 14,
                            lineHeight: 1.6
                        }}
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(marked.parse(form.getFieldValue('content') || '无正文') as string)
                        }}
                    />
                ) : (
                    <Form.Item name="content">
                        <TextArea
                            rows={8}
                            placeholder="支持 Markdown 和 LaTeX 语法..."
                            style={{ resize: 'vertical' }}
                        />
                    </Form.Item>
                )}

                {/* Subtasks */}
                {!isNew && note ? (
                    <>
                        <Divider plain style={{ margin: '16px 0' }}>
                            <Text strong>子任务</Text>
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                ({subtasks.filter(s => s.is_completed).length}/{subtasks.length})
                            </Text>
                        </Divider>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {subtasks.map((item: any) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <Checkbox
                                        checked={item.is_completed}
                                        onChange={() => handleToggleSubtask(item)}
                                    >
                                        <span style={{ textDecoration: item.is_completed ? 'line-through' : 'none', color: item.is_completed ? '#aaa' : undefined }}>
                                            {item.title}
                                        </span>
                                    </Checkbox>
                                    <Tooltip title="删除">
                                        <Button
                                            type="text"
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={async () => {
                                                await request.delete(`/v1/notes/${note.id}/subtasks/${item.id}`);
                                                setSubtasks(prev => prev.filter(s => s.id !== item.id));
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <Input
                                placeholder="添加子任务..."
                                value={newSubtaskTitle}
                                onChange={e => setNewSubtaskTitle(e.target.value)}
                                onPressEnter={handleAddSubtask}
                                style={{ flex: 1 }}
                            />
                            <Button icon={<PlusOutlined />} onClick={handleAddSubtask}>
                                添加
                            </Button>
                        </div>

                        {/* Attachments */}
                        <Divider plain style={{ margin: '16px 0' }}>
                            <Text strong>附件</Text>
                        </Divider>
                        <Upload.Dragger
                            name="file"
                            action={`/api/v1/notes/${note.id}/attachments`}
                            headers={{ Authorization: `Bearer ${localStorage.getItem('accessToken')}` }}
                            multiple
                            fileList={fileList}
                            onChange={info => {
                                setFileList(info.fileList);
                                if (info.file.status === 'done') {
                                    message.success(`${info.file.name} 上传成功！`);
                                    // Update the file list item with the server URL if returned
                                    if (info.file.response && info.file.response.data && info.file.response.data[0]) {
                                        const updated = info.fileList.map(f => {
                                            if (f.uid === info.file.uid) {
                                                return { ...f, url: info.file.response.data[0].file_path };
                                            }
                                            return f;
                                        });
                                        setFileList(updated);
                                    }
                                } else if (info.file.status === 'error') {
                                    message.error(`${info.file.name} 上传失败。`);
                                }
                            }}
                            onRemove={async (file) => {
                                try {
                                    // Try to delete from server if it has a real UID
                                    if (!file.uid.startsWith('rc-upload')) {
                                        await request.delete(`/v1/notes/${note.id}/attachments/${file.uid}`);
                                        message.success('附件已删除');
                                    }
                                    return true;
                                } catch (e) {
                                    message.error('删除附件失败');
                                    return false;
                                }
                            }}
                            onPreview={(file) => {
                                if (!file.url) return;
                                const ext = file.url.split('.').pop()?.toLowerCase() || '';
                                let type: 'image' | 'video' | 'audio' | 'pdf' | 'other' = 'other';
                                if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) type = 'image';
                                else if (['mp4', 'webm', 'mov'].includes(ext)) type = 'video';
                                else if (['mp3', 'wav', 'ogg'].includes(ext)) type = 'audio';
                                else if (['pdf'].includes(ext)) type = 'pdf';

                                if (type !== 'other') {
                                    setPreviewType(type);
                                    setPreviewImage(file.url);
                                    setPreviewOpen(true);
                                } else {
                                    // Fallback open in new tab (e.g. for docx etc)
                                    window.open(file.url, '_blank');
                                }
                            }}
                            style={{ borderRadius: 10, padding: '12px 0' }}
                        >
                            <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                            <p>拖拽文件到此处 或 点击上传</p>
                            <p><Text type="secondary" style={{ fontSize: 12 }}>≥ 500MB 自动切换分块上传</Text></p>
                        </Upload.Dragger>
                    </>
                ) : (
                    <>
                        <Divider plain style={{ margin: '16px 0' }}>
                            <Text strong>扩展功能</Text>
                        </Divider>
                        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#8c8c8c', background: '#fafafa', borderRadius: 8, border: '1px dashed #e8e8e8' }}>
                            💡 请先点击右上角「保存」新便签。<br />
                            保存成功后，即可在此处折腾<b>子任务清单</b>和上传<b>超大附件</b>！
                        </div>
                    </>
                )}
            </Form>

            {/* Media Preview Modal */}
            <Modal open={previewOpen} footer={null} onCancel={() => setPreviewOpen(false)} destroyOnHidden width={previewType === 'pdf' ? '80%' : 520} style={{ top: 20 }}>
                {previewType === 'image' && <img alt="preview" style={{ width: '100%' }} src={previewImage} />}
                {previewType === 'video' && <video controls autoPlay style={{ width: '100%' }} src={previewImage} />}
                {previewType === 'audio' && <audio controls autoPlay style={{ width: '100%' }} src={previewImage} />}
                {previewType === 'pdf' && <iframe style={{ width: '100%', height: '80vh', border: 'none' }} src={previewImage} title="PDF Preview" />}
            </Modal>
        </Drawer>
    );
};

export default NoteDrawer;
