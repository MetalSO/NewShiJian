import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getPost, updatePost } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './index.css';

const { Title } = Typography;
const { TextArea } = Input;

const EditPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    if (id) {
      fetchPost(id);
    }
  }, [id, isAuthenticated, navigate]);

  const fetchPost = async (postId: string) => {
    try {
      setFetchLoading(true);
      const data = await getPost(postId);
      if (data) {
        // 检查是否是作者
        if (data.author_id !== user?.id) {
          message.error('您没有权限编辑此帖子');
          navigate('/');
          return;
        }
        form.setFieldsValue({
          title: data.title,
          content: data.content,
        });
      } else {
        message.error('帖子不存在');
        navigate('/');
      }
    } catch (error) {
      console.error('获取帖子失败:', error);
      message.error('获取帖子失败');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (values: { title: string; content: string }) => {
    if (!id) return;

    try {
      setLoading(true);
      await updatePost(id, values.title, values.content);
      message.success('帖子更新成功！');
      navigate(`/post/${id}`);
    } catch (error) {
      console.error('更新帖子失败:', error);
      message.error('更新失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="edit-post-page">
      <Card className="edit-post-card">
        <Title level={3} className="page-title">
          编辑帖子
        </Title>
        
        <Form
          form={form}
          name="editPost"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[
              { required: true, message: '请输入帖子标题' },
              { min: 2, message: '标题至少2个字符' },
              { max: 100, message: '标题最多100个字符' },
            ]}
          >
            <Input placeholder="请输入帖子标题" />
          </Form.Item>

          <Form.Item
            label="内容"
            name="content"
            rules={[
              { required: true, message: '请输入帖子内容' },
              { min: 10, message: '内容至少10个字符' },
            ]}
          >
            <TextArea
              placeholder="请输入帖子内容..."
              rows={10}
              showCount
              maxLength={5000}
            />
          </Form.Item>

          <Form.Item className="form-actions">
            <Button
              type="default"
              onClick={() => navigate(`/post/${id}`)}
              style={{ marginRight: 16 }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
            >
              保存修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default EditPost;
