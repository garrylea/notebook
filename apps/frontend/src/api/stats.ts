import request from './request';

export const getOverview = () =>
    request.get<any, any>('/v1/stats/overview');

export const getTrend = (period: 'week' | 'month' = 'week') =>
    request.get<any, { date: string; count: number }[]>('/v1/stats/trend', { params: { period } });

export const getColorDistribution = () =>
    request.get<any, { color: string; count: number }[]>('/v1/stats/color-distribution');

export const getCalendarNotes = (start: string, end: string) =>
    request.get<any, any[]>('/v1/stats/calendar', { params: { start, end } });
