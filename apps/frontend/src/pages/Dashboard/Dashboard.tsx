import React, { useEffect, useState, useCallback } from 'react';
import {
    Layout, Menu, Input, Button, Typography, Space, Spin,
    Empty, Tooltip, Avatar, Dropdown, message
} from 'antd';
import {
    AppstoreOutlined, HistoryOutlined, PauseCircleOutlined,
    CalendarOutlined, BarChartOutlined, DeleteOutlined,
    PlusOutlined, SearchOutlined, UserOutlined, LogoutOutlined,
    FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useNoteStore } from '../../store/noteStore';
import { useAppStore } from '../../store';
import NoteCard from '../../components/NoteCard/NoteCard';
import NoteDrawer from '../../components/NoteDrawer/NoteDrawer';
import * as notesApi from '../../api/notes';
import { logout, getMe } from '../../api/auth';
import type { Note } from '../../api/notes';

const { Sider, Content, Header } = Layout;
const { Text, Title } = Typography;

const SECTION_ITEMS = [
    { key: 'active', icon: <AppstoreOutlined />, label: '主工作区' },
    { key: 'history', icon: <HistoryOutlined />, label: '历史记录' },
    { key: 'suspended', icon: <PauseCircleOutlined />, label: '悬挂列表' },
    { key: 'calendar', icon: <CalendarOutlined />, label: '日历视图' },
    { key: 'stats', icon: <BarChartOutlined />, label: '统计图表' },
    { key: 'deleted', icon: <DeleteOutlined />, label: '回收站', danger: true },
];

const SECTION_LABEL: Record<string, string> = {
    active: '主工作区',
    history: '历史记录',
    suspended: '悬挂列表',
    deleted: '回收站',
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, setUser } = useAppStore();
    const {
        notes, total, loading, hasMore, activeSection,
        setActiveSection, fetchNotes, appendNotes, removeNoteById, updateNoteInList
    } = useNoteStore();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editNoteId, setEditNoteId] = useState<string | null>(null);
    const [siderCollapsed, setSiderCollapsed] = useState(false);
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        const syncUser = async () => {
            if (localStorage.getItem('accessToken')) {
                try {
                    const data = await getMe();
                    setUser(data);
                } catch (e) {
                    // Ignore fail, might be expired token handled elsewhere
                }
            }
        };
        syncUser();
        fetchNotes(true);
    }, []);

    const handleSectionChange = ({ key }: { key: string }) => {
        if (key === 'calendar') { navigate('/calendar'); return; }
        if (key === 'stats') { navigate('/stats'); return; }
        setActiveSection(key as any);
    };

    const handleSearch = useCallback(() => {
        useNoteStore.getState().setFilters({ keyword });
        fetchNotes(true);
    }, [keyword]);

    const handleOpenNew = () => {
        setEditNoteId(null);
        setDrawerOpen(true);
    };

    const handleCardClick = (noteId: string) => {
        setEditNoteId(noteId);
        setDrawerOpen(true);
    };

    const handleStatusAction = async (noteId: string, status: string) => {
        const res = await notesApi.updateNoteStatus(noteId, status);
        if (activeSection === 'active' && status === 'in_progress') {
            updateNoteInList(res);
            message.success('任务已开始 🚀');
        } else {
            removeNoteById(noteId);
            message.success(status === 'completed' ? '已完成 ✅' : status === 'suspended' ? '已挂起 ⏸' : '已删除 🗑');
        }
    };

    const handleDelete = async (noteId: string) => {
        await notesApi.deleteNote(noteId);
        removeNoteById(noteId);
        message.success('已移入回收站');
    };

    const handleRestore = async (noteId: string) => {
        await notesApi.restoreNote(noteId);
        removeNoteById(noteId);
        message.success('已恢复到主工作区 ✅');
    };

    const handleSaved = (note: Note) => {
        if (editNoteId) {
            updateNoteInList(note);
        } else {
            fetchNotes(true);
        }
    };

    const handleLogout = async () => {
        await logout();
        localStorage.removeItem('accessToken');
        setUser(null);
        navigate('/login');
    };

    const userMenu = {
        items: [
            { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true }
        ],
        onClick: ({ key }: { key: string }) => {
            if (key === 'logout') handleLogout();
        }
    };

    // Infinite scroll handler
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 80) {
            appendNotes();
        }
    }, [appendNotes]);

    // Masonry: Distribute into 2 columns
    const leftNotes = notes.filter((_, i) => i % 2 === 0);
    const rightNotes = notes.filter((_, i) => i % 2 !== 0);

    return (
        <Layout style={{ minHeight: '100vh', background: '#f4f5f7' }}>
            {/* ---- Sidebar ---- */}
            <Sider
                collapsible
                collapsed={siderCollapsed}
                onCollapse={setSiderCollapsed}
                width={220}
                style={{
                    background: '#1e1e2e',
                    boxShadow: '2px 0 16px rgba(0,0,0,0.15)',
                    position: 'fixed',
                    left: 0, top: 0, bottom: 0,
                    zIndex: 100,
                    overflow: 'hidden',
                }}
                theme="dark"
            >
                {/* Brand */}
                <div style={{
                    padding: siderCollapsed ? '18px 0' : '18px 20px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: 8,
                }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                    }}>📝</div>
                    {!siderCollapsed && (
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                            Smart Notepad
                        </span>
                    )}
                </div>

                {/* New Note Button */}
                {!siderCollapsed && (
                    <div style={{ padding: '12px 14px' }}>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            block
                            onClick={handleOpenNew}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none', borderRadius: 10, fontWeight: 600,
                                boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                            }}
                        >
                            新建便签
                        </Button>
                    </div>
                )}

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[activeSection]}
                    onClick={handleSectionChange}
                    style={{ background: 'transparent', border: 'none' }}
                    items={SECTION_ITEMS}
                />

                {/* User info at bottom */}
                <div style={{
                    position: 'absolute', bottom: 48, left: 0, right: 0,
                    padding: siderCollapsed ? '14px 0' : '14px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: siderCollapsed ? 'center' : 'space-between',
                }}>
                    <Dropdown menu={userMenu} placement="topRight">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <Avatar
                                style={{ background: '#6366f1' }}
                                icon={<UserOutlined />}
                                size={30}
                            />
                            {!siderCollapsed && (
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                                    {user?.username || '我'}
                                </Text>
                            )}
                        </div>
                    </Dropdown>

                    {!siderCollapsed && (
                        <Tooltip title="退出登录">
                            <Button
                                type="text"
                                icon={<LogoutOutlined />}
                                onClick={handleLogout}
                                style={{ color: 'rgba(255,100,100,0.7)' }}
                            />
                        </Tooltip>
                    )}
                </div>
            </Sider>

            <Layout style={{ marginLeft: siderCollapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
                {/* ---- TopBar ---- */}
                <Header style={{
                    position: 'sticky', top: 0, zIndex: 99,
                    background: '#fff',
                    padding: '0 24px',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f0f0f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    height: 60,
                }}>
                    <Title level={5} style={{ margin: 0, color: '#1a1a2e' }}>
                        {SECTION_LABEL[activeSection] || '主工作区'}
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 13, fontWeight: 400 }}>
                            {total > 0 ? `共 ${total} 条` : ''}
                        </Text>
                    </Title>

                    <Space>
                        <Input.Search
                            placeholder="搜索便签..."
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            onSearch={handleSearch}
                            onPressEnter={handleSearch}
                            style={{ width: 260 }}
                            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                            allowClear
                            onClear={() => {
                                setKeyword('');
                                useNoteStore.getState().setFilters({ keyword: undefined });
                                fetchNotes(true);
                            }}
                        />
                        <Button icon={<FilterOutlined />}>筛选</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenNew}
                            style={{ background: '#6366f1', border: 'none' }}>
                            新建
                        </Button>
                    </Space>
                </Header>

                {/* ---- Main Content ---- */}
                <Content
                    onScroll={handleScroll}
                    style={{
                        padding: '24px',
                        overflowY: 'auto',
                        height: 'calc(100vh - 60px)',
                    }}
                >
                    {notes.length === 0 && !loading ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <span>
                                    {activeSection === 'active' ? '🎉 当前没有活跃的便签，点击「新建」开始吧！' : '暂无记录'}
                                </span>
                            }
                        >
                            {activeSection === 'active' && (
                                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenNew}
                                    style={{ background: '#6366f1', border: 'none' }}>
                                    新建第一条便签
                                </Button>
                            )}
                        </Empty>
                    ) : (
                        <>
                            {/* Masonry two-column grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'start' }}>
                                <div>
                                    {leftNotes.map(note => (
                                        <NoteCard
                                            key={note.id}
                                            note={note}
                                            onClick={() => handleCardClick(note.id)}
                                            onStart={() => handleStatusAction(note.id, 'in_progress')}
                                            onComplete={() => handleStatusAction(note.id, 'completed')}
                                            onSuspend={() => handleStatusAction(note.id, 'suspended')}
                                            onDelete={() => handleDelete(note.id)}
                                            onRestore={() => handleRestore(note.id)}
                                        />
                                    ))}
                                </div>
                                <div>
                                    {rightNotes.map(note => (
                                        <NoteCard
                                            key={note.id}
                                            note={note}
                                            onClick={() => handleCardClick(note.id)}
                                            onStart={() => handleStatusAction(note.id, 'in_progress')}
                                            onSuspend={() => handleStatusAction(note.id, 'suspended')}
                                            onDelete={() => handleDelete(note.id)}
                                            onRestore={() => handleRestore(note.id)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Load More / End */}
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                {loading && <Spin />}
                                {!loading && hasMore && (
                                    <Button onClick={appendNotes} type="text" style={{ color: '#6366f1' }}>
                                        ▼ 展开更多
                                    </Button>
                                )}
                                {!loading && !hasMore && notes.length > 0 && (
                                    <Text type="secondary">✓ 已加载全部 {total} 条</Text>
                                )}
                            </div>
                        </>
                    )}
                </Content>
            </Layout>

            {/* ---- Note Drawer ---- */}
            <NoteDrawer
                open={drawerOpen}
                noteId={editNoteId}
                onClose={() => setDrawerOpen(false)}
                onSaved={handleSaved}
            />
        </Layout>
    );
};

export default Dashboard;
