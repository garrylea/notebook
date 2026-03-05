import request from './request';

export const login = (data: any) => request.post('/v1/auth/login', data);
export const register = (data: any) => request.post('/v1/auth/register', data);
export const logout = () => request.post('/v1/auth/logout');
export const refreshToken = () => request.post('/v1/auth/refresh');
