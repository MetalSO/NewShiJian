import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Empty, Spin, Typography, Tag, Select, Avatar } from 'antd';
import { PlusOutlined, ClockCircleOutlined, FireOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPosts } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Post } from '../../types';
import './index.css';

const { Title, Text } = Typography;

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'popularity'>('time');
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const keyword = useMemo(() => {
    return new URLSearchParams(location.search).get('q')?.trim() || '';
  }, [location.search]);

  useEffect(() => {
    void fetchPosts(sortBy);
  }, [sortBy]);

  const fetchPosts = async (sortOption: 'time' | 'popularity' = 'time') => {
    try {
      setLoading(true);
      const data = await getPosts();

      const sortedData = [...data];
      if (sortOption === 'time') {
        sortedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortOption === 'popularity') {
        sortedData.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      }

      setPosts(sortedData);
    } catch (error) {
      console.error('获取帖子失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100 && !isFetchingMore && !loading) {
        setIsFetchingMore(true);
        void fetchPosts(sortBy).finally(() => setIsFetchingMore(false));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFetchingMore, loading, sortBy]);

  const extractFirstImageUrl = (content: string): string | null => {
    const imgRegex = /!\[.*?\]\((.*?)\)/g;
    const match = imgRegex.exec(content);
    return match ? match[1] : null;
  };

  const getAvatarUrl = (username: string, avatar?: string): string => {
    return avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPosts = useMemo(() => {
    if (!keyword) {
      return posts;
    }

    const normalizedKeyword = keyword.toLowerCase();
    return posts.filter((post) => {
      const title = post.title?.toLowerCase() || '';
      const summary = post.summary?.toLowerCase() || '';
      const content = post.content?.toLowerCase() || '';
      return title.includes(normalizedKeyword) || summary.includes(normalizedKeyword) || content.includes(normalizedKeyword);
    });
  }, [keyword, posts]);

  return (
    <div className="home-page">
      <div className="page-header">
        <Title level={2}>实践论坛</Title>
        <div className="header-actions">
          <Select
            value={sortBy}
            onChange={(value) => setSortBy(value as 'time' | 'popularity')}
            style={{ width: 120, marginRight: 16 }}
          >
            <Select.Option value="time">
              <ClockCircleOutlined /> 按时间
            </Select.Option>
            <Select.Option value="popularity">
              <FireOutlined /> 按热度
            </Select.Option>
          </Select>
          {isAuthenticated && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
              发布帖子
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="empty-card">
          <Empty description={keyword ? `未找到与“${keyword}”相关的文章` : '暂无帖子，快来发布第一个吧！'} />
        </Card>
      ) : (
        <div>
          <div className="posts-grid">
            {filteredPosts.map((post) => {
              const imageUrl = post.cover_image || extractFirstImageUrl(post.content);
              const avatarUrl = getAvatarUrl(post.author_username, post.author_avatar);
              const summaryText = (post.summary || '').trim();

              return (
                <Card
                  key={post.id}
                  className="post-card-modern"
                  hoverable
                  onClick={() => navigate(`/post/${post.id}`)}
                  cover={
                    imageUrl ? (
                      <div className="post-cover">
                        <img src={imageUrl} alt={post.title} />
                      </div>
                    ) : null
                  }
                >
                  <div className="post-content">
                    <Title level={4} className="post-title-modern">
                      {post.title}
                    </Title>
                    {summaryText && <Text className="post-preview-modern">{summaryText}</Text>}
                    <div className="post-footer">
                      <div className="author-info">
                        <Avatar src={avatarUrl} alt={post.author_username} className="author-avatar" size="small" />
                        <span className="author-name">{post.author_username}</span>
                      </div>
                      <div className="post-meta-modern">
                        <Tag icon={<ClockCircleOutlined />} color="default">
                          {formatDate(post.created_at)}
                        </Tag>
                        {post.likes !== undefined && <Tag color="red">{post.likes} 赞</Tag>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {isFetchingMore && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Spin size="large" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
