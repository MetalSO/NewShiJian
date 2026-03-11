import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Badge } from 'antd';
import { UserOutlined, HomeOutlined, PlusOutlined, LogoutOutlined, SettingOutlined, MessageOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUnreadCount } from '../../services/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './MainLayout.css';

const { Header, Content, Footer } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { resolvedMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      return;
    }

    let mounted = true;
    let intervalId: ReturnType<typeof setInterval>;

    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadCount(user.id);
        if (mounted) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.error('获取未读消息数失败:', error);
      }
    };

    // 立即获取一次
    fetchUnreadCount();
    
    // 每30秒轮询一次
    intervalId = setInterval(fetchUnreadCount, 30000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'messages',
      icon: <MessageOutlined />,
      label: '我的消息',
      onClick: () => navigate('/messages'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/create',
      icon: <PlusOutlined />,
      label: <Link to="/create">发布帖子</Link>,
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">个人中心</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">设置</Link>,
    },
  ];

  return (
    <Layout className="main-layout">
      <Header className="header">
        <div className="logo">
          <Link to="/">
            <h1>实践论坛</h1>
          </Link>
        </div>
        <Menu
          theme={resolvedMode === 'dark' ? 'dark' : 'light'}
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="nav-menu"
        />
        <div className="header-right">
          {isAuthenticated ? (
            <Space>
              <span className="welcome-text">欢迎, {user?.username}</span>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Badge count={unreadCount} overflowCount={99} size="small">
                  <Avatar icon={<UserOutlined />} className="user-avatar" />
                </Badge>
              </Dropdown>
            </Space>
          ) : (
            <Space>
              <Button type="primary" onClick={() => navigate('/login')}>
                登录
              </Button>
              <Button onClick={() => navigate('/register')}>
                注册
              </Button>
            </Space>
          )}
        </div>
      </Header>
      <Content className="content">
        <div className="content-wrapper">{children}</div>
      </Content>
      <Footer className="footer">
        实践论坛 ©{new Date().getFullYear()} - 基于 CAF 协议构建
      </Footer>
    </Layout>
  );
};

export default MainLayout;
