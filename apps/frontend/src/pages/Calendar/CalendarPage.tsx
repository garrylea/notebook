import React, { useEffect, useState, useMemo } from 'react';
import {
    Layout, Typography, Calendar, Badge, Spin, Drawer,
    Tag, Space, Button, Empty,
} from 'antd';
import { PlusOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import * as statsApi from '../../api/stats';
import NoteDrawer from '../../components/NoteDrawer/NoteDrawer';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

const COLOR_MAP: Record<string, string> = {
    red: 'error', orange: 'warning', blue: 'processing',
    green: 'success', yellow: 'warning', purple: 'default', gray: 'default',
};

const PRIORITY_COLOR: Record<string, string> = {
    urgent: '#ff4d4f', high: '#fa8c16', medium: '#1677ff', low: '#52c41a',
};

const CalendarPage: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
    const [calNotes, setCalNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dayDrawerOpen, setDayDrawerOpen] = useState(false);
    const [selectedDayNotes, setSelectedDayNotes] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editNoteId, setEditNoteId] = useState<string | null>(null);

    const fetchNotes = async (month: Dayjs) => {
        setLoading(true);
        try {
            const start = month.startOf('month').format('YYYY-MM-DD');
            const end = month.endOf('month').format('YYYY-MM-DD');
            const data: any = await statsApi.getCalendarNotes(start, end);
            setCalNotes(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotes(currentMonth); }, [currentMonth]);

    // Group notes by date string YYYY-MM-DD
    const notesByDate = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const note of calNotes) {
            if (!note.due_date) continue;
            const d = dayjs(note.due_date).format('YYYY-MM-DD');
            if (!map.has(d)) map.set(d, []);
            map.get(d)!.push(note);
        }
        return map;
    }, [calNotes]);

    const getDateListData = (date: Dayjs) => {
        return notesByDate.get(date.format('YYYY-MM-DD')) || [];
    };

    const dateCellRender = (date: Dayjs) => {
        const items = getDateListData(date);
        if (items.length === 0) return null;
        return (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {items.slice(0, 3).map(note => (
                    <li key={note.id} style={{ marginBottom: 2 }}>
                        <Badge
                            status={COLOR_MAP[note.color] as any || 'default'}
                            text={
                                <span style={{
                                    fontSize: 11,
                                    color: PRIORITY_COLOR[note.priority],
                                    fontWeight: note.priority === 'urgent' ? 700 : 400,
                                    display: 'inline-block',
                                    maxWidth: 120,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle',
                                }}>
                                    {note.title}
                                </span>
                            }
                        />
                    </li>
                ))}
                {items.length > 3 && (
                    <li style={{ fontSize: 11, color: '#bbb' }}>+{items.length - 3} 更多</li>
                )}
            </ul>
        );
    };

    const handleDateSelect = (date: Dayjs) => {
        const notes = getDateListData(date);
        if (notes.length === 0) return;
        setSelectedDate(date.format('YYYY年MM月DD日'));
        setSelectedDayNotes(notes);
        setDayDrawerOpen(true);
    };

    const handlePrevMonth = () => setCurrentMonth(m => m.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentMonth(m => m.add(1, 'month'));

    // Stats for header
    const todayStr = dayjs().format('YYYY-MM-DD');
    const overdueCount = calNotes.filter(n =>
        dayjs(n.due_date).format('YYYY-MM-DD') < todayStr && n.status !== 'completed'
    ).length;
    const todayCount = (notesByDate.get(todayStr) || []).length;

    return (
        <Layout style={{ background: '#f4f5f7', minHeight: '100vh' }}>
            <Header style={{
                background: '#fff', padding: '0 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                height: 60,
            }}>
                {/* Month navigation */}
                <Space>
                    <Button icon={<LeftOutlined />} type="text" onClick={handlePrevMonth} />
                    <Title level={5} style={{ margin: 0, minWidth: 120, textAlign: 'center' }}>
                        {currentMonth.format('YYYY年 MM月')}
                    </Title>
                    <Button icon={<RightOutlined />} type="text" onClick={handleNextMonth} />
                    <Button type="text" size="small"
                        style={{ color: '#6366f1' }}
                        onClick={() => setCurrentMonth(dayjs())}>
                        今天
                    </Button>
                </Space>

                <Space>
                    {overdueCount > 0 && (
                        <Tag color="error">⚠ {overdueCount} 条已逾期</Tag>
                    )}
                    {todayCount > 0 && (
                        <Tag color="blue">📅 今日 {todayCount} 条</Tag>
                    )}
                    <Button type="primary" icon={<PlusOutlined />}
                        style={{ background: '#6366f1', border: 'none' }}
                        onClick={() => { setEditNoteId(null); setEditDrawerOpen(true); }}>
                        新建
                    </Button>
                </Space>
            </Header>

            <Content style={{ padding: 24 }}>
                <div style={{
                    background: '#fff', borderRadius: 16,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                }}>
                    {loading ? (
                        <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>
                    ) : (
                        <Calendar
                            value={currentMonth}
                            onSelect={handleDateSelect}
                            cellRender={(date, info) => {
                                if (info.type === 'date') return dateCellRender(date);
                                return null;
                            }}
                            headerRender={() => null}  // We use our own header
                            style={{ padding: '0 8px 8px' }}
                        />
                    )}
                </div>

                {/* Legend */}
                <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
                        <Space key={p} size={4}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                            <Text style={{ fontSize: 12, color: '#888' }}>
                                {{ urgent: '紧急', high: '高优', medium: '中等', low: '低优' }[p]}
                            </Text>
                        </Space>
                    ))}
                </div>
            </Content>

            {/* Day detail drawer */}
            <Drawer
                title={`📅 ${selectedDate}`}
                open={dayDrawerOpen}
                onClose={() => setDayDrawerOpen(false)}
                width={380}
            >
                {selectedDayNotes.length === 0 ? (
                    <Empty description="该日无便签" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedDayNotes.map(note => (
                            <div
                                key={note.id}
                                onClick={() => {
                                    setDayDrawerOpen(false);
                                    setEditNoteId(note.id);
                                    setEditDrawerOpen(true);
                                }}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: 12,
                                    background: '#fafafa',
                                    border: '1px solid #f0f0f0',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f0f0ff')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text strong style={{ fontSize: 14 }}>{note.title}</Text>
                                    <Tag
                                        style={{
                                            background: `${PRIORITY_COLOR[note.priority]}18`,
                                            color: PRIORITY_COLOR[note.priority],
                                            border: 'none', borderRadius: 6, fontSize: 11
                                        }}
                                    >
                                        {{ urgent: '紧急', high: '高优', medium: '中等', low: '低优' }[note.priority as string] ?? note.priority}
                                    </Tag>
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <Badge status={COLOR_MAP[note.color] as any || 'default'} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {dayjs(note.due_date).format('HH:mm 截止')}
                                    </Text>
                                    {note.status === 'completed' && (
                                        <Tag color="success" style={{ fontSize: 11, borderRadius: 6 }}>已完成</Tag>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Drawer>

            {/* Note edit drawer */}
            <NoteDrawer
                open={editDrawerOpen}
                noteId={editNoteId}
                onClose={() => setEditDrawerOpen(false)}
                onSaved={() => {
                    setEditDrawerOpen(false);
                    fetchNotes(currentMonth);
                }}
            />
        </Layout>
    );
};

export default CalendarPage;
