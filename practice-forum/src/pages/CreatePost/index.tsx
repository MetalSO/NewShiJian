import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Button, Card, Typography, Space, Tooltip, message } from 'antd';
import { ArrowLeftOutlined, EyeOutlined, EditOutlined, BoldOutlined, ItalicOutlined, LinkOutlined, CodeOutlined, UnorderedListOutlined, OrderedListOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { createPost, updatePost, getPost } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PdfUploader from '../../components/PdfUploader';
import './index.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PostData {
  author_id: string;
  title: string;
  content: string;
  cover_image?: string;
}

const CreatePost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const fetchPost = useCallback(async (postId: string) => {
    try {
      const data = await getPost(postId) as PostData | null;
      if (data) {
        if (data.author_id !== user?.id) {
          message.error('您没有权限编辑此帖子');
          navigate('/');
          return;
        }
        form.setFieldsValue({
          title: data.title,
          content: data.content,
          cover_image: data.cover_image,
        });
        setContent(data.content);
      }
    } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
      message.error('获取帖子失败');
      navigate('/');
    }
  }, [user, form, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    if (id) {
      fetchPost(id);
    }
  }, [id, isAuthenticated, navigate, fetchPost]);

  const handleSubmit = async (values: { title: string; content: string; cover_image?: string }) => {
    if (!user) {
      message.error('用户未登录');
      return;
    }

    try {
      setLoading(true);

      if (id) {
        await updatePost(id, values.title, values.content, values.cover_image);
        message.success('帖子更新成功！');
        navigate(`/post/${id}`);
      } else {
        const newPost = await createPost(values.title, values.content, user, values.cover_image);
        message.success('帖子发布成功！');
        navigate(`/post/${newPost.id}`);
      }
    } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
      message.error(id ? '更新失败' : '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfParsed = (pdfContent: string) => {
    form.setFieldsValue({ content: pdfContent });
    setContent(pdfContent);
    message.success('PDF内容已填充到编辑器');
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('.content-textarea textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    form.setFieldsValue({ content: newText });
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
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
          <Button
            icon={previewMode ? <EditOutlined /> : <EyeOutlined />}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? '编辑' : '预览'}
          </Button>
          <Button
            type="primary"
            loading={loading}
            onClick={() => form.submit()}
          >
            {isEditing ? '保存修改' : '发布帖子'}
          </Button>
        </Space>
      </div>

      <Card className="create-post-card">
        <Form
          form={form}
          name="createPost"
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="title"
            rules={[
              { required: true, message: '请输入帖子标题' },
              { min: 2, message: '标题至少2个字符' },
              { max: 100, message: '标题最多100个字符' },
            ]}
          >
            <Input
              placeholder="输入帖子标题..."
              size="large"
              className="title-input"
            />
          </Form.Item>

          <Form.Item
            name="cover_image"
            label="封面图URL（可选）"
          >
            <Input
              placeholder="输入封面图URL，支持jpg、png等格式"
              className="cover-image-input"
            />
          </Form.Item>


          <Form.Item
            name="content"
            rules={[
              { required: true, message: '请输入帖子内容' },
              { min: 10, message: '内容至少10个字符' },
            ]}
          >
            {previewMode ? (
              <div className="markdown-preview">
                <Text type="secondary" className="preview-label">预览</Text>
                <div className="preview-content">
                  {content || form.getFieldValue('content') || '暂无内容'}
                </div>
              </div>
            ) : (
              <div className="editor-container">
                <div className="editor-toolbar">
                  <Space size={4}>
                    <Tooltip title="粗体">
                      <Button
                        type="text"
                        icon={<BoldOutlined />}
                        onClick={() => insertMarkdown('**', '**')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                    <Tooltip title="斜体">
                      <Button
                        type="text"
                        icon={<ItalicOutlined />}
                        onClick={() => insertMarkdown('*', '*')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                    <Tooltip title="代码">
                      <Button
                        type="text"
                        icon={<CodeOutlined />}
                        onClick={() => insertMarkdown('`', '`')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                    <Tooltip title="代码块">
                      <Button
                        type="text"
                        icon={<CodeOutlined />}
                        onClick={() => insertMarkdown('```\n', '\n```')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                    <Tooltip title="无序列表">
                      <Button
                        type="text"
                        icon={<UnorderedListOutlined />}
                        onClick={() => insertMarkdown('- ')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                    <Tooltip title="有序列表">
                      <Button
                        type="text"
                        icon={<OrderedListOutlined />}
                        onClick={() => insertMarkdown('1. ')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                    <Tooltip title="链接">
                      <Button
                        type="text"
                        icon={<LinkOutlined />}
                        onClick={() => insertMarkdown('[', '](url)')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                    <Tooltip title="引用">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => insertMarkdown('> ')}
                        className="toolbar-btn"
                      />
                    </Tooltip>
                  </Space>
                  <Text type="secondary" className="help-text">
                    支持 Markdown 格式
                  </Text>
                </div>
                <TextArea
                  className="content-textarea"
                  placeholder="输入帖子内容... 支持 Markdown 格式"
                  rows={18}
                  value={content}
                  onChange={handleContentChange}
                  showCount
                  maxLength={10000}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item label="PDF上传解析" help="可选：上传PDF文件自动提取内容到编辑器">
            <PdfUploader 
              onPdfParsed={handlePdfParsed}
              disabled={previewMode}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreatePost;
