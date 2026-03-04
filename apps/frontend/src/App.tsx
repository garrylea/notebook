import { Outlet } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import { useAppStore } from './store';
import './App.css';

function App() {
  const currentTheme = useAppStore((state) => state.theme);

  return (
    <ConfigProvider
      theme={{
        algorithm:
          currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#4F46E5', // Set to our primary brand color
          borderRadius: 8
        }
      }}
    >
      <AntApp>
        <div className="app-container">
          <Outlet /> {/* Renders child routes here */}
        </div>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
