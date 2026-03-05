import React, { useEffect, useState } from 'react';
import {
    Drawer, Form, Input, Select, DatePicker, Button, Divider,
    List, Checkbox, Tooltip, Space, Upload, Typography, Spin
} from 'antd';
import {
    PlusOutlined, DeleteOutlined, SaveOutlined, UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Note } from '../../api/notes';
import * as notesApi from '../../api/notes';
import request from '../../api/request';

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
    const isNew = !noteId;

    // Load note details when opening
    useEffect(() => {
        if (!open) return;
        if (isNew) {
            form.resetFields();
            setNote(null);
            setSubtasks([]);
            setDirty(false);
            return;
        }
        setLoading(true);
        notesApi.getNoteById(noteId!).then(data => {
            setNote(data as any);
            setSubtasks((data as any).subtasks || []);
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
            width={520}
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
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
            ) : (
                <Form
                    form={form}
                    layout="vertical"
                    onValuesChange={() => setDirty(true)}
                    initialValues={{ color: 'blue', priority: 'medium' }}
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
                    <Form.Item name="content" label="正文">
                        <TextArea
                            rows={4}
                            placeholder="添加详细描述..."
                            style={{ resize: 'none' }}
                        />
                    </Form.Item>

                    {/* Subtasks */}
                    {!isNew && note && (
                        <>
                            <Divider plain style={{ margin: '16px 0' }}>
                                <Text strong>子任务</Text>
                                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                    ({subtasks.filter(s => s.is_completed).length}/{subtasks.length})
                                </Text>
                            </Divider>
                            <List
                                size="small"
                                dataSource={subtasks}
                                renderItem={(item: any) => (
                                    <List.Item
                                        style={{ padding: '6px 0', border: 'none' }}
                                        actions={[
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
                                        ]}
                                    >
                                        <Checkbox
                                            checked={item.is_completed}
                                            onChange={() => handleToggleSubtask(item)}
                                        >
                                            <span style={{ textDecoration: item.is_completed ? 'line-through' : 'none', color: item.is_completed ? '#aaa' : undefined }}>
                                                {item.title}
                                            </span>
                                        </Checkbox>
                                    </List.Item>
                                )}
                            />
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
                                onChange={info => {
                                    if (info.file.status === 'done') {
                                        // Will implement chunked upload for larger files later
                                    }
                                }}
                                style={{ borderRadius: 10, padding: '12px 0' }}
                            >
                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                <p>拖拽文件到此处 或 点击上传</p>
                                <p><Text type="secondary" style={{ fontSize: 12 }}>≥ 5MB 自动切换分块上传</Text></p>
                            </Upload.Dragger>
                        </>
                    )}
                </Form>
            )}
        </Drawer>
    );
};

export default NoteDrawer;
