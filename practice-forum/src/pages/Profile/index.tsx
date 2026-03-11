import React, { useEffect, useState } from 'react';
import { Card, Avatar, Typography, List, Button, Tag, Space, message, Modal, Empty, Descriptions, Badge, Tabs } from 'antd';
import { UserOutlined, SafetyCertificateOutlined, LogoutOutlined, AppstoreOutlined, DeleteOutlined, CopyOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme, colorMap } from '../../context/ThemeContext';
import { getUserInfo, getAuthorizations, revokeAuthorization, getPermissions } from '../../services/api';
import type { CAFUserInfo, CAFAuthorization } from '../../types';
import './index.css';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { color } = useTheme();
  const [userInfo, setUserInfo] = useState<CAFUserInfo | null>(null);
  const [authorizations, setAuthorizations] = useState<CAFAuthorization[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }
    fetchData();
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [info, auths, perms] = await Promise.all([
        getUserInfo(),
        getAuthorizations(),
        getPermissions().catch(() => []),
      ]);
      setUserInfo(info);
      setAuthorizations(auths);
      setPermissions(perms);
    } catch (error: any) {
      console.error('获取数据失败:', error);
      message.error(error.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
  };

  const copyUserId = () => {
    if (userInfo?.id) {
      navigator.clipboard.writeText(userInfo.id);
      message.success('用户ID已复制到剪贴板');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined /> 个人信息
        </span>
      ),
      children: (
        <div className="profile-section">
          <Card className="info-card">
            <div className="user-header">
              <Avatar size={80} icon={<UserOutlined />} className="avatar" />
              <div className="user-details">
                <Title level={3}>{userInfo?.username || user?.username}</Title>
                <Space>
                  <Badge status="success" text="已认证" />
                  <Tag icon={<SafetyCertificateOutlined />} color="blue">CAF 用户</Tag>
                </Space>
              </div>
            </div>

            <Descriptions column={1} className="user-descriptions">
              <Descriptions.Item label="用户ID">
                <code>{userInfo?.id || user?.id}</code>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={copyUserId}
                >
                  复制
                </Button>
              </Descriptions.Item>
              <Descriptions.Item label="登录状态">
                <Badge status="processing" text="已登录" />
              </Descriptions.Item>
              <Descriptions.Item label="已授权应用">
                <Text strong>{authorizations.length}</Text> 个
              </Descriptions.Item>
              <Descriptions.Item label="拥有权限">
                <Text strong>{permissions.length}</Text> 个
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {permissions.length > 0 && (
            <Card title="您的权限" size="small" className="permissions-card">
              <Space wrap>
                {permissions.map((p) => (
                  <Tag key={p} color="green">
                    {p}
                  </Tag>
                ))}
              </Space>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'apps',
      label: (
        <span>
          <AppstoreOutlined /> 已授权应用
        </span>
      ),
      children: (
        <Card loading={loading}>
          {authorizations.length === 0 ? (
            <Empty description="暂无已授权的应用" />
          ) : (
            <List
              dataSource={authorizations}
              renderItem={(auth) => (
                <List.Item
                  actions={[
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: '确认撤销授权',
                          content: `确定要撤销对 "${auth.sub_server_name}" 的授权吗？撤销后该应用将无法访问您的数据。`,
                          okText: '撤销',
                          okType: 'danger',
                          onOk: async () => {
                            try {
                              await revokeAuthorization(auth.sub_server_id);
                              message.success('已撤销授权');
                              fetchData();
                            } catch (error) {
                              message.error('撤销授权失败');
                            }
                          },
                        });
                      }}
                    >
                      撤销
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: colorMap[color] || '#1890ff' }}>
                        {auth.sub_server_name.charAt(0).toUpperCase()}
                      </Avatar>
                    }
                    title={auth.sub_server_name}
                    description={
                      <div className="auth-permissions">
                        <Text type="secondary">权限: </Text>
                        <Space wrap>
                          {auth.permissions.map((p) => (
                            <Tag key={p} color="blue">
                              {p}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <KeyOutlined /> 账号安全
        </span>
      ),
      children: (
        <Card loading={loading}>
          <List>
            <List.Item
              actions={[
                <Tag color="success">已启用</Tag>,
              ]}
            >
              <List.Item.Meta
                title="CAF 统一认证"
                description="通过 CAF 中心认证服务器登录"
              />
            </List.Item>
            <List.Item
              actions={[
                <Button onClick={handleLogout}>重新登录</Button>,
              ]}
            >
              <List.Item.Meta
                title="会话管理"
                description="当前会话有效"
              />
            </List.Item>
          </List>
        </Card>
      ),
    },
  ];

  return (
    <div className="profile-page">
      <Card className="profile-tabs-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          centered
        />
      </Card>

      <Card className="danger-zone">
        <Title level={5}>
          <LogoutOutlined /> 退出登录
        </Title>
        <Text type="secondary">
          退出当前账号，返回登录页面
        </Text>
        <div style={{ marginTop: 16 }}>
          <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
