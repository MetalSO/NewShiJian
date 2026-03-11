import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './context/AuthContext';
import { useTheme, colorMap } from './context/ThemeContext';
import { ReadingPreferencesProvider } from './context/ReadingPreferencesContext';
import router from './router';
import './App.css';

function App() {
  const { color } = useTheme();
  
  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: colorMap[color] || '#1890ff',
        },
        cssVar: { prefix: 'antd' },
      }}
    >
      <AuthProvider>
        <ReadingPreferencesProvider>
          <RouterProvider router={router} />
        </ReadingPreferencesProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
