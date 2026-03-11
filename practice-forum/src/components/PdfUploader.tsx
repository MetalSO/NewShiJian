import React, { useState, useRef } from 'react';
import { Upload, Button, Progress, Typography, Space, Alert, Card, message } from 'antd';
import { UploadOutlined, FilePdfOutlined, CloseOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';

// pdfjs-dist库实例，将在parsePdf函数中动态加载
let pdfjsLib: any;

const { Text } = Typography;

interface PdfUploaderProps {
  onPdfParsed: (content: string) => void;
  disabled?: boolean;
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ onPdfParsed, disabled = false }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsePdf = async (file: File): Promise<string> => {
    try {
      // 确保pdfjsLib已加载
      if (!pdfjsLib) {
        const pdf = await import('pdfjs-dist');
        pdfjsLib = pdf;
        // 使用本地 worker 文件
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }

      // 读取文件为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);
      
      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setProgress(50);
      
      let fullText = '';
      const totalPages = pdf.numPages;
      
      // 逐页提取文本
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // 拼接文本项
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
        
        // 更新进度
        setProgress(50 + Math.floor((pageNum / totalPages) * 40));
      }
      
      setProgress(95);
      
      // 清理空白字符，但保留段落结构
      const cleanedText = fullText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      return cleanedText;
    } catch (err) {
      console.error('PDF解析错误:', err);
      throw new Error(`PDF解析失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      // 解析PDF文件
      const textContent = await parsePdf(file);
      
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      onPdfParsed(textContent);
      message.success('PDF解析完成，内容已填充到编辑器');
      
      // 清空文件列表
      setFileList([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF解析失败');
      message.error('PDF解析失败');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.pdf',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      // 验证文件类型
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        message.error('只能上传PDF文件');
        return Upload.LIST_IGNORE;
      }

      // 验证文件大小（最大10MB）
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过10MB');
        return Upload.LIST_IGNORE;
      }

      const uploadFile: UploadFile = {
        uid: '-1',
        name: file.name,
        status: 'uploading',
        percent: 0,
        originFileObj: file,
      };
      setFileList([uploadFile]);
      handleUpload(file);
      return false; // 阻止默认上传
    },
    onRemove: () => {
      setFileList([]);
      setError(null);
      setProgress(0);
    },
    onChange: (info) => {
      let newFileList = [...info.fileList];
      newFileList = newFileList.slice(-1); // 只保留一个文件
      setFileList(newFileList);
    },
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const uploadFile: UploadFile = {
          uid: '-1',
          name: file.name,
          status: 'uploading',
          percent: 0,
          originFileObj: file as any,
        };
        setFileList([uploadFile]);
        handleUpload(file);
      } else {
        setError('只能上传PDF文件');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <Card 
      size="small" 
      className="pdf-uploader-card"
      title={
        <Space>
          <FilePdfOutlined />
          <span>上传PDF文件</span>
        </Space>
      }
      extra={
        fileList.length > 0 && !uploading && (
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={() => {
              setFileList([]);
              setError(null);
              setProgress(0);
            }}
            size="small"
          />
        )
      }
    >
      <div 
        className="pdf-upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: '2px dashed #d9d9d9',
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          backgroundColor: '#fafafa',
          transition: 'all 0.3s',
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload {...uploadProps} disabled={disabled} showUploadList={false}>
          <div style={{ pointerEvents: disabled ? 'none' : 'auto' }}>
            <FilePdfOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>
              点击或拖拽PDF文件到此区域
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
              支持单个PDF文件，最大10MB
            </Text>
            <Button 
              type="primary" 
              icon={<UploadOutlined />}
              disabled={disabled}
            >
              选择PDF文件
            </Button>
          </div>
        </Upload>
      </div>

      {uploading && (
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
            正在解析PDF: {fileList[0]?.name}
          </Text>
          <Progress percent={progress} status="active" />
        </div>
      )}

      {error && (
        <Alert
          message="解析错误"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: '16px' }}
          closable
          onClose={() => setError(null)}
        />
      )}

      <div style={{ marginTop: '16px' }}>
        <Text type="secondary">
          <small>
            提示：PDF解析功能将从文件中提取文本内容，并自动填充到编辑器。提取的内容可能需要进一步编辑和格式化。
          </small>
        </Text>
      </div>
    </Card>
  );
};

export default PdfUploader;