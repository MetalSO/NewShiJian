import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Typography, 
  Button, 
  Badge, 
  Avatar, 
  Space, 
  Tag, 
  Divider,
  Empty,
  Spin,
  message as antdMessage,
  Popconfirm
} from 'antd';
import { 
  MessageOutlined, 
  LikeOutlined, 
  CommentOutlined, 
  BellOutlined, 
  UserOutlined, 
  CheckOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { getMessages, getUnreadCount, markMessageAsRead, markAllMessagesAsRead, deleteMessage } from '../../services/api';
import type { Message } from '../../types';
import { __FOR_TESTING } from '../../types';
import './index.css';

const { Title, Text } = Typography;

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  console.log(__FOR_TESTING);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchUnreadCount();
    }
  }, [user, activeTab]);

  const fetchMessages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const options = activeTab === 'unread' ? { unread_only: true } : undefined;
      const data = await getMessages(user.id, options);
      setMessages(data);
    } catch (error) {
      console.error('获取消息失败:', error);
      antdMessage.error('获取消息失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const count = await getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('获取未读消息数失败:', error);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const updatedMessage = await markMessageAsRead(messageId);
      if (updatedMessage) {
        setMessages(messages.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
        antdMessage.success('已标记为已读');
      }
    } catch (error) {
      console.error('标记消息为已读失败:', error);
      antdMessage.error('标记消息为已读失败');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      const success = await markAllMessagesAsRead(user.id);
      if (success) {
        setMessages(messages.map(msg => ({ ...msg, is_read: true })));
        setUnreadCount(0);
        antdMessage.success('所有消息已标记为已读');
      }
    } catch (error) {
      console.error('标记所有消息为已读失败:', error);
      antdMessage.error('标记所有消息为已读失败');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId);
      if (success) {
        setMessages(messages.filter(msg => msg.id !== messageId));
        if (messages.find(msg => msg.id === messageId && !msg.is_read)) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        }
        antdMessage.success('消息已删除');
      }
    } catch (error) {
      console.error('删除消息失败:', error);
      antdMessage.error('删除消息失败');
    }
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'reply':
        return <CommentOutlined style={{ color: '#1890ff' }} />;
      case 'like':
        return <LikeOutlined style={{ color: '#52c41a' }} />;
      case 'mention':
        return <UserOutlined style={{ color: '#722ed1' }} />;
      case 'system':
        return <BellOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <MessageOutlined />;
    }
  };

  const getMessageTypeText = (type: Message['type']) => {
    switch (type) {
      case 'reply':
        return '回复';
      case 'like':
        return '点赞';
      case 'mention':
        return '提及';
      case 'system':
        return '系统';
      default:
        return '消息';
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins <1)  return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (!user) {
    return (
      <div className="messages-container">
        <Card>
          <Empty description="请先登录以查看消息" />
        </Card>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <Card>
        <div className="messages-header">
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Title level={2} style={{ margin: 0 }}>
              <MessageOutlined /> 我的消息
            </Title>
            <Space>
              <Badge count={unreadCount} overflowCount={99}>
                <Tag color="blue">未读: {unreadCount}</Tag>
              </Badge>
              <Button 
                type="primary" 
                icon={<CheckOutlined />}
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                全部标记为已读
              </Button>
            </Space>
          </Space>

          <Divider />

          <div className="messages-tabs">
            <Button 
              type={activeTab === 'all' ? 'primary' : 'default'}
              onClick={() => setActiveTab('all')}
            >
              全部消息
            </Button>
            <Button 
              type={activeTab === 'unread' ? 'primary' : 'default'}
              onClick={() => setActiveTab('unread')}
            >
              未读消息 <Badge count={unreadCount} size="small" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : messages.length === 0 ? (
          <Empty description={activeTab === 'unread' ? '暂无未读消息' : '暂无消息'} />
        ) : (
          <List
            dataSource={messages}
            renderItem={(msg) => (
              <List.Item
                className={`message-item ${msg.is_read ? '' : 'unread'}`}
                actions={[
                  !msg.is_read && (
                    <Button 
                      type="link" 
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleMarkAsRead(msg.id)}
                    >
                      标记已读
                    </Button>
                  ),
                  <Popconfirm
                    title="确定要删除这条消息吗？"
                    onConfirm={() => handleDeleteMessage(msg.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      type="link" 
                      size="small" 
                      danger
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Badge dot={!msg.is_read}>
                      <Avatar icon={getMessageIcon(msg.type)} />
                    </Badge>
                  }
                  title={
                    <Space>
                      <Tag color={msg.is_read ? 'default' : 'blue'}>
                        {getMessageTypeText(msg.type)}
                      </Tag>
                      <Text strong={!msg.is_read}>{msg.content}</Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary">
                        来自: {msg.sender_username} • {formatTime(msg.created_at)}
                      </Text>
                      {msg.post_title && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          相关帖子: {msg.post_title}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default MessagesPage;