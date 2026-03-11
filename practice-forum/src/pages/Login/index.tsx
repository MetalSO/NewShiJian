import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { loginWithOAuth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './index.css';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('oauth');
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleOAuthLogin = async () => {
    try {
      setOauthLoading(true);
      const { token, user } = await loginWithOAuth();
      authLogin(token, user);
      message.success('登录成功！');
      navigate('/');
    } catch (error: any) {
      console.error('OAuth 登录失败:', error);
      if (error.message === '用户取消了授权') {
        message.info('您取消了授权');
      } else {
        message.error(error.message || 'OAuth 登录失败');
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      const response = await fetch(`${CAF_BASE_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '注册失败');
      }

      message.success('注册成功！请登录');
      setActiveTab('oauth');
    } catch (error: any) {
      console.error('注册失败:', error);
      message.error(error.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: 'oauth',
      label: (
        <span>
          <SafetyCertificateOutlined />
          CAF 授权登录
        </span>
      ),
      children: (
        <div className="oauth-tab">
          <div className="oauth-description">
            <Text type="secondary">
              点击下方按钮跳转至 CAF 认证中心完成登录授权
            </Text>
          </div>
          
          <Button
            type="primary"
            size="large"
            block
            icon={<SafetyCertificateOutlined />}
            loading={oauthLoading}
            onClick={handleOAuthLogin}
            className="oauth-button"
          >
            CAF OAuth 授权登录
          </Button>

          <div className="oauth-steps">
            <Text strong>登录流程：</Text>
            <ol>
              <li>点击上方按钮打开授权窗口</li>
              <li>使用 CAF 账号登录并授权</li>
              <li>授权完成后自动跳转</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      key: 'register',
      label: (
        <span>
          <UserOutlined />
          注册账号
        </span>
      ),
      children: (
        <Form
          name="register"
          onFinish={handleRegister}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 48 }}
            >
              注册
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div className="login-page">
      <Card className="login-card">
        <Title level={3} className="login-title">
          实践论坛
        </Title>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          centered
          size="large"
        />

        <div className="oauth-info">
          <Text type="secondary">
            CAF 统一认证
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
