import React from 'react';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';

interface Props {
  children: React.ReactNode;
}

const App: React.FC<Props> = ({ children }) => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 10,
          fontFamily: "'Inter', 'PingFang SC', -apple-system, sans-serif",
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <AntdApp>
        {children}
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
