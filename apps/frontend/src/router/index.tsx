import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import Dashboard from '../pages/Dashboard/Dashboard';

// Heavy pages — loaded only when the user navigates to them
const StatsPage = lazy(() => import('../pages/Stats/StatsPage'));
const CalendarPage = lazy(() => import('../pages/Calendar/CalendarPage'));

const PageSpin = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" />
    </div>
);

// Route guard: If no access token, redirect to login
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

const router = createBrowserRouter([
    {
        path: '/',
        element: <RequireAuth><Dashboard /></RequireAuth>,
    },
    {
        path: '/stats',
        element: (
            <RequireAuth>
                <Suspense fallback={<PageSpin />}>
                    <StatsPage />
                </Suspense>
            </RequireAuth>
        ),
    },
    {
        path: '/calendar',
        element: (
            <RequireAuth>
                <Suspense fallback={<PageSpin />}>
                    <CalendarPage />
                </Suspense>
            </RequireAuth>
        ),
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Register />,
    }
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}
