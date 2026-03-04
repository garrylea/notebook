import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './router';
import 'antd/dist/reset.css'; // Ant Design base rest
import './index.css';         // Custom global styles

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
);
