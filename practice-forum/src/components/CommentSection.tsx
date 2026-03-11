import React, { useState, useEffect, useCallback } from 'react';
import { Card, Avatar, Typography, Button, Input, List, Divider, Tag, message, Modal, Space } from 'antd';
import { UserOutlined, ClockCircleOutlined, SendOutlined, LikeOutlined, LikeFilled } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getComments, createComment, likeComment, unlikeComment, createReport, checkCommentLikeStatus } from '../services/api';

const { Text } = Typography;
const { TextArea } = Input;

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_username: string;
  author_avatar?: string;
  created_at: string;
  likes?: number;
}

interface CommentSectionProps {
  postId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getComments(postId);
      setComments(data);
      
      // 检查每个评论的点赞状态
      if (user && data.length > 0) {
        const newCommentLikes: Record<string, boolean> = {};
        for (const comment of data) {
          try {
            const isLiked = await checkCommentLikeStatus(comment.id, user.id);
            newCommentLikes[comment.id] = isLiked;
          } catch (error) {
            console.error(`检查评论 ${comment.id} 点赞状态失败:`, error);
            newCommentLikes[comment.id] = false;
          }
        }
        setCommentLikes(newCommentLikes);
      } else {
        setCommentLikes({});
      }
    } catch (error) {
      console.error('获取评论失败:', error);
      message.error('获取评论失败');
    } finally {
      setLoading(false);
    }
  }, [postId, user]);

  // 加载评论
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      message.warning('请输入评论内容');
      return;
    }

    if (!user) {
      message.error('请先登录');
      return;
    }

    setSubmitting(true);
    try {
      const newComment = await createComment(postId, commentText, user, replyingToCommentId || undefined);
      setComments([newComment, ...comments]);
      setCommentText('');
      message.success('评论发布成功');
      setReplyingToCommentId(null);
    } catch (error) {
      console.error('发布评论失败:', error);
      message.error('发布评论失败');
    } finally {
    setSubmitting(false);
  }
};

const handleReportSubmit = async () => {
  if (!reportingCommentId || !user || !reportReason.trim()) return;
  
  try {
    await createReport(user, 'comment', reportingCommentId, reportReason);
    message.success('举报已提交，感谢您的反馈');
    setReportingCommentId(null);
    setReportReason('');
  } catch (error) {
    console.error('提交举报失败:', error);
    message.error('提交举报失败');
  }
};

const handleLikeComment = async (commentId: string) => {
  if (likingCommentId || !user) return;
  
  setLikingCommentId(commentId);
  try {
    const updatedComment = await likeComment(commentId, user);
    if (updatedComment) {
      setComments(comments.map(comment => 
        comment.id === commentId ? { ...comment, likes: updatedComment.likes } : comment
      ));
      // 更新点赞状态
      setCommentLikes(prev => ({ ...prev, [commentId]: true }));
      message.success('已点赞');
    }
  } catch (error) {
    console.error('点赞评论失败:', error);
    message.error('点赞评论失败');
  } finally {
    setLikingCommentId(null);
  }
};

const handleUnlikeComment = async (commentId: string) => {
  if (likingCommentId || !user) return;
  
  setLikingCommentId(commentId);
  try {
    const updatedComment = await unlikeComment(commentId, user);
    if (updatedComment) {
      setComments(comments.map(comment => 
        comment.id === commentId ? { ...comment, likes: updatedComment.likes } : comment
      ));
      // 更新点赞状态
      setCommentLikes(prev => ({ ...prev, [commentId]: false }));
      message.success('已取消点赞');
    }
  } catch (error) {
    console.error('取消点赞评论失败:', error);
    message.error('取消点赞评论失败');
  } finally {
    setLikingCommentId(null);
  }
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

  const getAvatarUrl = (username: string, avatar?: string): string => {
    return avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff`;
  };

  return (
    <div className="comment-section">
      <Divider orientation={"left" as any}>
        <h3 style={{ margin: 0 }}>评论区 ({comments.length})</h3>
      </Divider>

      {replyingToCommentId && (
          <div className="replying-to-notice" style={{ marginBottom: '16px', padding: '8px 16px', background: '#f0f9ff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              正在回复 <strong>@{replyingToCommentId ? comments.find(c => c.id === replyingToCommentId)?.author_username : ''}</strong>
            </span>
            <Button 
              type="text" 
              size="small"
              onClick={() => setReplyingToCommentId(null)}
            >
              取消回复
            </Button>
          </div>
        )}
        <Card className="comment-input-card">
        <div className="comment-input-wrapper">
          <TextArea
            rows={3}
            placeholder="写下你的评论..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={1000}
            showCount
            style={{ marginBottom: '16px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmitComment}
              loading={submitting}
              disabled={!commentText.trim()}
            >
              发布评论
            </Button>
          </div>
        </div>
      </Card>

      <List
        className="comment-list"
        loading={loading}
        itemLayout="vertical"
        dataSource={comments}
        renderItem={(comment) => (
          <List.Item>
            <Card size="small" className="comment-card">
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flexShrink: 0 }}>
                  <Avatar
                    src={getAvatarUrl(comment.author_username, comment.author_avatar)}
                    size={40}
                    icon={<UserOutlined />}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Text strong style={{ marginRight: '8px' }}>
                        {comment.author_username}
                      </Text>
                      <Tag icon={<ClockCircleOutlined />} color="default">
                        {formatDate(comment.created_at)}
                      </Tag>
                    </div>
                    {comment.likes !== undefined && comment.likes > 0 && (
                      <Tag color="red">{comment.likes} 赞</Tag>
                    )}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <Text>{comment.content}</Text>
                  </div>
                  <Space size={[16, 8]} wrap style={{ marginTop: '12px' }}>
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => setReplyingToCommentId(comment.id)}
                      style={{ padding: 0, color: '#1890ff' }}
                    >
                      回复
                    </Button>
                    <span style={{ color: '#d9d9d9' }}>|</span>
                    {commentLikes[comment.id] ? (
                      <>
                        <Button 
                          type="link" 
                          icon={<LikeFilled />} 
                          onClick={() => handleUnlikeComment(comment.id)}
                          loading={likingCommentId === comment.id}
                          disabled={!user}
                          size="small"
                          style={{ padding: 0, color: '#1890ff' }}
                        >
                          <span style={{ marginLeft: 4 }}>{comment.likes || 0}</span>
                        </Button>
                        {user && (
                          <>
                            <span style={{ color: '#d9d9d9' }}>|</span>
                            <Button 
                              type="link" 
                              danger
                              onClick={() => handleUnlikeComment(comment.id)}
                              loading={likingCommentId === comment.id}
                              disabled={!user}
                              size="small"
                              style={{ padding: 0 }}
                            >
                              取消点赞
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Button 
                          type="link" 
                          icon={<LikeOutlined />} 
                          onClick={() => handleLikeComment(comment.id)}
                          loading={likingCommentId === comment.id}
                          disabled={!user}
                          size="small"
                          style={{ padding: 0, color: '#52c41a' }}
                        >
                          <span style={{ marginLeft: 4 }}>{comment.likes || 0}</span>
                        </Button>
                        {user && (
                          <>
                            <span style={{ color: '#d9d9d9' }}>|</span>
                            <Button 
                              type="primary"
                              onClick={() => handleLikeComment(comment.id)}
                              loading={likingCommentId === comment.id}
                              disabled={!user}
                              size="small"
                              style={{ padding: 0 }}
                            >
                              点赞
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    <span style={{ color: '#d9d9d9' }}>|</span>
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => setReportingCommentId(comment.id)}
                      style={{ padding: 0, color: '#ff4d4f' }}
                    >
                      举报
                    </Button>
                  </Space>
                </div>
              </div>
            </Card>
          </List.Item>
        )}
      />
        
        <Modal
          title="举报评论"
          open={!!reportingCommentId}
          onOk={handleReportSubmit}
          onCancel={() => {
            setReportingCommentId(null);
            setReportReason('');
          }}
          okText="提交举报"
          cancelText="取消"
        >
          <p>请描述举报原因：</p>
          <Input.TextArea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="请输入举报原因，例如：垃圾信息、骚扰、不实信息等"
            rows={4}
          />
        </Modal>
      </div>
  );
};

export default CommentSection;