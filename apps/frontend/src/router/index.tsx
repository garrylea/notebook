import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import Dashboard from '../pages/Dashboard/Dashboard';

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
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Login />, // Reuse login layout for now, will add register page
    }
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}
