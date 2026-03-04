import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '../App';

// For MVP we just stub out basic routes
// We will replace these with real pages later.
const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            {
                path: '',
                element: <div>Dashboard / Board View</div>
            },
            {
                path: 'history',
                element: <div>History View</div>
            },
            {
                path: 'calendar',
                element: <div>Calendar View</div>
            }
        ]
    },
    {
        path: '/login',
        element: <div>Login Page</div>
    }
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}
