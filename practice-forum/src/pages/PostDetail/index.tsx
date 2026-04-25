import React, { useEffect, useState, useRef } from 'react';
import { Typography, Button, Tag, Space, Modal, message, Spin, Progress, Drawer, Slider } from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  LikeOutlined,
  LikeFilled,
  MenuOutlined,
  FontSizeOutlined,
  LineHeightOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPost, deletePost, likePost, unlikePost, checkPostLikeStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  useReadingPreferences,
  type FontFamily,
  type FontSize,
  type LineHeight,
  fontSizeMap,
  lineHeightMap,
  fontFamilyMap,
} from '../../context/ReadingPreferencesContext';
import CommentSection from '../../components/CommentSection';
import './index.css';

const { Title, Text } = Typography;

interface PostDetailData {
  id: string;
  title: string;
  summary?: string;
  content: string;
  author_id: string;
  author_username: string;
  author_avatar?: string;
  cover_image?: string;
  likes?: number;
  views?: number;
  created_at: string;
  updated_at?: string;
}

const fontFamilyLabelMap: Record<FontFamily, string> = {
  simsun: '宋体',
  heiti: '黑体',
  songti: '宋体SC',
  kaiti: '楷体',
  yahei: '微软雅黑',
  arial: 'Arial',
};

const fontSizeSliderMap: Record<number, FontSize> = {
  12: 'small',
  14: 'small',
  16: 'medium',
  18: 'large',
  20: 'xlarge',
  22: 'xlarge',
  24: 'xlarge',
};

const lineHeightSliderMap: Record<number, LineHeight> = {
  1.4: 'compact',
  1.6: 'compact',
  1.8: 'normal',
  2.0: 'relaxed',
  2.2: 'relaxed',
  2.4: 'relaxed',
};

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PostDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, applyStyles, setFontFamily, setFontSize, setLineHeight, setMaxWidth } = useReadingPreferences();

  useEffect(() => {
    if (id) {
      void fetchPost(id);
      if (user) {
        checkPostLikeStatus(id, user.id)
          .then((isLiked) => {
            setLiked(isLiked);
          })
          .catch((err) => {
            console.error('检查点赞状态失败:', err);
          });
      }
    }
  }, [id, user]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
      setReadingProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPost = async (postId: string) => {
    try {
      setLoading(true);
      const data = await getPost(postId);
      if (data) {
        setPost(data as PostDetailData);
      } else {
        message.error('帖子不存在');
        navigate('/');
      }
    } catch (error) {
      console.error('获取帖子失败:', error);
      message.error('获取帖子失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!id || !user || liking || liked) return;

    setLiking(true);
    try {
      const updatedPost = await likePost(id, user);
      if (updatedPost && post) {
        setPost({ ...post, likes: updatedPost.likes });
        setLiked(true);
        message.success('已点赞');
      }
    } catch (error) {
      console.error('点赞失败:', error);
      message.error('点赞失败');
    } finally {
      setLiking(false);
    }
  };

  const handleUnlike = async () => {
    if (!id || !user || liking || !liked) return;

    setLiking(true);
    try {
      const updatedPost = await unlikePost(id, user);
      if (updatedPost && post) {
        setPost({ ...post, likes: updatedPost.likes });
        setLiked(false);
        message.success('已取消点赞');
      }
    } catch (error) {
      console.error('取消点赞失败:', error);
      message.error('取消点赞失败');
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个帖子吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!id) return;
        try {
          await deletePost(id);
          message.success('帖子已删除');
          navigate('/');
        } catch (error) {
          console.error('删除帖子失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAuthor = post && user && post.author_id === user.id;
  const articleStyle: React.CSSProperties = {
    ...applyStyles(),
  };
  const pageWidthStyle: React.CSSProperties = {
    ['--post-content-max-width' as string]: preferences.maxWidth ? '980px' : '760px',
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="post-detail-page" ref={contentRef} style={pageWidthStyle}>
      <Progress
        percent={Math.round(readingProgress)}
        showInfo={false}
        strokeColor={preferences.fontFamily === 'simsun' || preferences.fontFamily === 'songti' ? '#1890ff' : '#52c41a'}
        trailColor="transparent"
        size="small"
        className="reading-progress-bar"
      />

      <div className="post-reading-toolbar">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} className="back-button">
          返回列表
        </Button>

        <div className="reading-info">
          <Tag color={preferences.maxWidth ? 'blue' : 'orange'}>{fontFamilyLabelMap[preferences.fontFamily]}</Tag>
          <Tag>{fontSizeMap[preferences.fontSize]}px</Tag>
          <Tag>行距 {lineHeightMap[preferences.lineHeight]}</Tag>
          <Tag color={preferences.maxWidth ? 'green' : 'gold'}>
            {preferences.maxWidth ? '宽松模式' : '紧凑模式'}
          </Tag>
        </div>

        <Button icon={<MenuOutlined />} onClick={() => setShowSettingsDrawer(true)}>
          阅读设置
        </Button>
      </div>

      <article className="post-article" style={articleStyle}>
        <header className="post-header-section">
          <Title level={1} className="post-title-main">
            {post.title}
          </Title>
          <p className={`post-summary ${post.summary?.trim() ? '' : 'post-summary-empty'}`}>
            {post.summary?.trim() || '暂无摘要'}
          </p>

          <div className="post-meta-row">
            <div className="post-author-info">
              <div className="author-avatar">
                <UserOutlined />
              </div>
              <div className="author-details">
                <Text strong className="author-name">
                  {post.author_username}
                </Text>
                <Text type="secondary" className="post-time">
                  发布于 {formatDate(post.created_at)}
                </Text>
              </div>
            </div>

            <div className="post-like-section">
              {liked ? (
                <>
                  <Button
                    type="text"
                    icon={<LikeFilled />}
                    onClick={handleUnlike}
                    loading={liking}
                    disabled={!user}
                    className="like-button"
                    style={{ color: '#1890ff' }}
                  >
                    {post.likes || 0}
                  </Button>
                  <Button
                    type="text"
                    danger
                    onClick={handleUnlike}
                    loading={liking}
                    disabled={!user}
                    className="unlike-button"
                    size="small"
                  >
                    取消点赞
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="text"
                    icon={<LikeOutlined />}
                    onClick={handleLike}
                    loading={liking}
                    disabled={!user}
                    className="like-button"
                  >
                    {post.likes || 0}
                  </Button>
                  {user && (
                    <Button
                      type="primary"
                      onClick={handleLike}
                      loading={liking}
                      disabled={!user}
                      className="like-action-button"
                      size="small"
                    >
                      点赞
                    </Button>
                  )}
                </>
              )}
            </div>

            {isAuthor && (
              <Space className="post-actions">
                <Button type="default" icon={<EditOutlined />} onClick={() => navigate(`/edit/${post.id}`)}>
                  编辑
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                  删除
                </Button>
              </Space>
            )}
          </div>

          {post.updated_at && post.updated_at !== post.created_at && (
            <div className="post-updated">
              <ClockCircleOutlined />
              更新于 {formatDate(post.updated_at)}
            </div>
          )}
        </header>

        <div className="post-content-section">
          <div className="markdown-content e-book-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </div>
        </div>
      </article>

      <Drawer
        title="阅读设置"
        placement="right"
        onClose={() => setShowSettingsDrawer(false)}
        open={showSettingsDrawer}
        width={320}
      >
        <div className="settings-drawer-content">
          <div className="setting-group">
            <Text strong>
              <FontSizeOutlined /> 字体
            </Text>
            <div className="font-buttons" style={{ marginTop: 12 }}>
              {Object.entries(fontFamilyMap).map(([key, value]) => (
                <Button
                  key={key}
                  block
                  type={preferences.fontFamily === key ? 'primary' : 'default'}
                  onClick={() => setFontFamily(key as FontFamily)}
                  style={{ fontFamily: value, marginBottom: 8 }}
                >
                  {fontFamilyLabelMap[key as FontFamily]}
                </Button>
              ))}
            </div>
          </div>

          <div className="setting-group" style={{ marginTop: 24 }}>
            <Text strong>
              <FontSizeOutlined /> 字号: {fontSizeMap[preferences.fontSize]}px
            </Text>
            <Slider
              min={12}
              max={24}
              step={2}
              value={fontSizeMap[preferences.fontSize]}
              onChange={(value) => {
                const normalizedValue = Array.isArray(value) ? value[0] : value;
                setFontSize(fontSizeSliderMap[normalizedValue] || 'medium');
              }}
              marks={{ 12: '小', 16: '中', 20: '大', 24: '特大' }}
              style={{ marginTop: 8 }}
            />
          </div>

          <div className="setting-group" style={{ marginTop: 24 }}>
            <Text strong>
              <LineHeightOutlined /> 行距: {lineHeightMap[preferences.lineHeight]}
            </Text>
            <Slider
              min={1.4}
              max={2.4}
              step={0.2}
              value={lineHeightMap[preferences.lineHeight]}
              onChange={(value) => {
                const normalizedValue = Array.isArray(value) ? value[0] : value;
                setLineHeight(lineHeightSliderMap[normalizedValue] || 'normal');
              }}
              marks={{ 1.4: '紧凑', 1.8: '正常', 2.4: '宽松' }}
              style={{ marginTop: 8 }}
            />
          </div>

          <div className="setting-group" style={{ marginTop: 24 }}>
            <Text strong>
              <ExpandOutlined /> 页面宽度
            </Text>
            <div style={{ marginTop: 12 }}>
              <Button
                type={preferences.maxWidth ? 'primary' : 'default'}
                icon={<ExpandOutlined />}
                block
                style={{ marginBottom: 8 }}
                onClick={() => setMaxWidth(true)}
              >
                宽松模式
              </Button>
              <Button
                type={!preferences.maxWidth ? 'primary' : 'default'}
                icon={<CompressOutlined />}
                block
                onClick={() => setMaxWidth(false)}
              >
                紧凑模式
              </Button>
            </div>
          </div>

          <div className="current-settings" style={{ marginTop: 32, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              当前设置预览
            </Text>
            <p style={{ ...articleStyle, margin: 0 }}>
              这是一段示例文本，用于预览您选择的阅读设置效果。字体、字号和行距会与正文同步生效。
            </p>
          </div>
        </div>
      </Drawer>

      {id && <CommentSection postId={id} />}
    </div>
  );
};

export default PostDetail;
