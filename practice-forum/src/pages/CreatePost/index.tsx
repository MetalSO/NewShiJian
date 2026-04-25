import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Button, Card, Typography, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { createPost, updatePost, getPost } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import VditorEditor from '../../components/VditorEditor';
import './index.css';

const { Title } = Typography;
const { TextArea } = Input;

interface PostData {
  author_id: string;
  title: string;
  summary?: string;
  content: string;
  cover_image?: string;
}

const CreatePost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const fetchPost = useCallback(
    async (postId: string) => {
      try {
        const data = (await getPost(postId)) as PostData | null;
        if (data) {
          if (data.author_id !== user?.id) {
            message.error('您没有权限编辑此帖子');
            navigate('/');
            return;
          }
          form.setFieldsValue({
            title: data.title,
            summary: data.summary || '',
            content: data.content,
            cover_image: data.cover_image,
          });
          setContent(data.content);
        }
      } catch {
        message.error('获取帖子失败');
        navigate('/');
      }
    },
    [user, form, navigate],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    if (id) {
      void fetchPost(id);
      return;
    }

    form.setFieldsValue({ content: '' });
    setContent('');
  }, [id, isAuthenticated, navigate, fetchPost, form]);

  const handleSubmit = async (values: { title: string; summary: string; content: string; cover_image?: string }) => {
    if (!user) {
      message.error('用户未登录');
      return;
    }

    try {
      setLoading(true);

      if (id) {
        await updatePost(id, values.title, values.summary, values.content, values.cover_image);
        message.success('帖子更新成功');
        navigate(`/post/${id}`);
      } else {
        const newPost = await createPost(values.title, values.summary, values.content, user, values.cover_image);
        message.success('帖子发布成功');
        navigate(`/post/${newPost.id}`);
      }
    } catch {
      message.error(id ? '更新失败' : '发布失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const isEditing = !!id;

  return (
    <div className="create-post-page">
      <div className="page-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <Title level={3} className="page-title">
          {isEditing ? '编辑帖子' : '发布新帖子'}
        </Title>
        <Space>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {isEditing ? '保存修改' : '发布帖子'}
          </Button>
        </Space>
      </div>

      <Card className="create-post-card">
        <Form form={form} name="createPost" onFinish={handleSubmit} layout="vertical" initialValues={{ content: '' }}>
          <Form.Item
            name="title"
            rules={[
              { required: true, message: '请输入帖子标题' },
              { min: 2, message: '标题至少2个字符' },
              { max: 100, message: '标题最多100个字符' },
            ]}
          >
            <Input placeholder="输入帖子标题..." size="large" className="title-input" />
          </Form.Item>

          <Form.Item name="cover_image" label="封面图URL（可选）">
            <Input placeholder="输入封面图URL，支持jpg、png等格式" className="cover-image-input" />
          </Form.Item>

          <Form.Item
            name="summary"
            label="摘要"
            rules={[
              { required: true, message: '请输入摘要' },
              { max: 220, message: '摘要最多220个字符' },
            ]}
          >
            <TextArea placeholder="输入摘要，将展示在首页预览中" rows={3} showCount maxLength={220} />
          </Form.Item>

          <Form.Item
            name="content"
            rules={[
              { required: true, message: '请输入帖子内容' },
              { min: 10, message: '内容至少10个字符' },
            ]}
          >
            <VditorEditor
              mode="ir"
              value={content}
              onChange={(markdown) => {
                setContent(markdown);
                form.setFieldValue('content', markdown);
              }}
              placeholder="输入帖子内容... 支持 Markdown 格式"
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreatePost;

