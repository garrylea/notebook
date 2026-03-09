import axios from 'axios';
import { message } from 'antd';

// Custom axios instance with interceptors
const request = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000,
    withCredentials: true // needed for refresh token logic via cookies
});

// Request interceptor
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
request.interceptors.response.use(
    (response) => {
        const res = response.data;
        // Assume our standard response is { code: number, message: string, data: any }
        if (res.code === 200 || res.code === 201) {
            return res.data;
        } else {
            message.error(res.message || 'Request failed');
            return Promise.reject(new Error(res.message || 'Error'));
        }
    },
    async (error) => {
        // 401 token refresh strategy defined in specs
        if (error.response?.status === 401) {
            // Logic to transparently refresh access token goes here
            // For now we'll just throw the error and let the app redirect to login
            message.error('Session expired, please log in again.');
            window.location.href = '/login';
        } else {
            const backendMsg = error.response?.data?.message;
            message.error(backendMsg || error.message || 'Network error');
        }
        return Promise.reject(error);
    }
);

export default request;
