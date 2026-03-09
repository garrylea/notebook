import React, { useEffect, useState } from 'react';
import { Layout, Card, Row, Col, Statistic, Select, Typography, Spin, Button } from 'antd';
import {
    CheckCircleOutlined, FireOutlined, PauseCircleOutlined,
    DeleteOutlined, RiseOutlined, AppstoreOutlined, LeftOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as statsApi from '../../api/stats';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

const COLOR_PALETTE: Record<string, string> = {
    red: '#ff4d4f', orange: '#fa8c16', blue: '#1677ff',
    green: '#52c41a', yellow: '#faad14', purple: '#722ed1', gray: '#8c8c8c',
};

const StatsPage: React.FC = () => {
    const [period, setPeriod] = useState<'week' | 'month'>('week');
    const [overview, setOverview] = useState<any>(null);
    const [trend, setTrend] = useState<{ date: string; count: number }[]>([]);
    const [colorDist, setColorDist] = useState<{ color: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [ov, tr, cd] = await Promise.all([
                    statsApi.getOverview(),
                    statsApi.getTrend(period),
                    statsApi.getColorDistribution(),
                ]);
                setOverview(ov);
                setTrend(tr as any);
                setColorDist(cd as any);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [period]);

    /* ---- ECharts options ---- */

    const trendOption = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        grid: { left: 16, right: 16, bottom: 24, top: 24, containLabel: true },
        xAxis: {
            type: 'category',
            data: trend.map(d => d.date.slice(5)), // show MM-DD
            axisLine: { lineStyle: { color: '#e0e0e0' } },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            splitLine: { lineStyle: { color: '#f5f5f5' } },
        },
        series: [{
            name: '完成便签',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 7,
            data: trend.map(d => d.count),
            lineStyle: { color: '#6366f1', width: 3 },
            itemStyle: { color: '#6366f1' },
            areaStyle: {
                color: {
                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(99,102,241,0.25)' },
                        { offset: 1, color: 'rgba(99,102,241,0.0)' },
                    ]
                }
            },
        }]
    };

    const colorPieOption = {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { orient: 'horizontal', bottom: 4, textStyle: { fontSize: 12 } },
        series: [{
            type: 'pie',
            radius: ['45%', '70%'],
            avoidLabelOverlap: false,
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
            data: colorDist.map(d => ({
                name: d.color,
                value: d.count,
                itemStyle: { color: COLOR_PALETTE[d.color] || '#ccc' }
            }))
        }]
    };

    const statusBarOption = !overview ? {} : {
        tooltip: { trigger: 'axis' },
        grid: { left: 12, right: 12, bottom: 8, top: 8, containLabel: true },
        xAxis: { type: 'value', splitLine: { show: false } },
        yAxis: {
            type: 'category',
            data: ['归档', '已删除', '挂起', '已完成', '进行中'],
            axisLine: { show: false },
            axisTick: { show: false },
        },
        series: [{
            type: 'bar',
            barMaxWidth: 32,
            data: [
                { value: overview.archived || 0, itemStyle: { color: '#8c8c8c', borderRadius: [0, 6, 6, 0] } },
                { value: overview.deleted || 0, itemStyle: { color: '#ff7875', borderRadius: [0, 6, 6, 0] } },
                { value: overview.suspended || 0, itemStyle: { color: '#fa8c16', borderRadius: [0, 6, 6, 0] } },
                { value: overview.completed || 0, itemStyle: { color: '#52c41a', borderRadius: [0, 6, 6, 0] } },
                { value: overview.in_progress || 0, itemStyle: { color: '#6366f1', borderRadius: [0, 6, 6, 0] } },
            ],
        }]
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Layout style={{ background: '#f4f5f7', minHeight: '100vh' }}>
            <Header style={{
                background: '#fff', padding: '0 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                height: 60,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Button type="text" icon={<LeftOutlined />} onClick={() => window.location.href = '/'} />
                    <AppstoreOutlined style={{ fontSize: 20, color: '#6366f1' }} />
                    <Title level={5} style={{ margin: 0 }}>统计图表</Title>
                </div>
                <Select
                    value={period}
                    onChange={v => setPeriod(v)}
                    style={{ width: 110 }}
                    options={[
                        { value: 'week', label: '近 7 天' },
                        { value: 'month', label: '近 30 天' },
                    ]}
                />
            </Header>

            <Content style={{ padding: 24 }}>
                {/* ---- Overview Cards ---- */}
                <Row gutter={[16, 16]}>
                    {[
                        { label: '活跃便签', value: overview?.in_progress ?? 0, icon: <RiseOutlined />, color: '#6366f1', bg: '#ede9fe' },
                        { label: '已完成', value: overview?.completed ?? 0, icon: <CheckCircleOutlined />, color: '#52c41a', bg: '#f6ffed' },
                        { label: '高优便签', value: overview?.urgent ?? 0, icon: <FireOutlined />, color: '#ff4d4f', bg: '#fff1f0' },
                        { label: '已挂起', value: overview?.suspended ?? 0, icon: <PauseCircleOutlined />, color: '#fa8c16', bg: '#fff7e6' },
                        { label: '回收站', value: overview?.deleted ?? 0, icon: <DeleteOutlined />, color: '#8c8c8c', bg: '#f5f5f5' },
                    ].map(item => (
                        <Col xs={24} sm={12} lg={6} xl={4} key={item.label} style={{ flex: '1 1 180px' }}>
                            <Card
                                variant="borderless"
                                style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                                styles={{ body: { padding: '20px 24px' } }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Statistic
                                        title={<Text style={{ fontSize: 13, color: '#888' }}>{item.label}</Text>}
                                        value={item.value}
                                        styles={{ content: { fontSize: 28, fontWeight: 700, color: item.color } }}
                                    />
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 14,
                                        background: item.bg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 22, color: item.color,
                                    }}>
                                        {item.icon}
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* ---- Charts Row ---- */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    {/* Trend line chart */}
                    <Col xs={24} lg={16}>
                        <Card
                            title={<span style={{ fontWeight: 700 }}>📈 完成趋势</span>}
                            extra={<Text type="secondary" style={{ fontSize: 12 }}>每日完成数量</Text>}
                            variant="borderless"
                            style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                        >
                            <ReactECharts
                                option={trendOption}
                                style={{ height: 260 }}
                                opts={{ renderer: 'canvas' }}
                            />
                        </Card>
                    </Col>

                    {/* Color pie chart */}
                    <Col xs={24} lg={8}>
                        <Card
                            title={<span style={{ fontWeight: 700 }}>🎨 颜色分布</span>}
                            extra={<Text type="secondary" style={{ fontSize: 12 }}>按便签配色</Text>}
                            variant="borderless"
                            style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
                        >
                            {colorDist.length > 0 ? (
                                <ReactECharts
                                    option={colorPieOption}
                                    style={{ height: 260 }}
                                    opts={{ renderer: 'canvas' }}
                                />
                            ) : (
                                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text type="secondary">暂无数据</Text>
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>

                {/* ---- Status bar chart ---- */}
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={24}>
                        <Card
                            title={<span style={{ fontWeight: 700 }}>📊 状态分布</span>}
                            variant="borderless"
                            style={{ borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                        >
                            <ReactECharts
                                option={statusBarOption}
                                style={{ height: 200 }}
                                opts={{ renderer: 'canvas' }}
                            />
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
};

export default StatsPage;
