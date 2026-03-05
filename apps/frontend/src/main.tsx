import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './router/index';
import App from './App';
import 'antd/dist/reset.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App>
      <AppRouter />
    </App>
  </React.StrictMode>
);
