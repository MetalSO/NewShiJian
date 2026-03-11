import React, { useEffect } from 'react';
import { Spin, Result } from 'antd';
import './index.css';

const OAuthCallback: React.FC = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description') || error;

    const sendMessageAndClose = () => {
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'OAUTH_CALLBACK',
            code: code,
            error: errorDescription,
          },
          '*'
        );
      }
    };

    sendMessageAndClose();

    setTimeout(() => {
      if (code) {
        window.close();
      } else if (error) {
        window.close();
      }
    }, 2000);
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  let title = '正在处理授权...';
  let subTitle = '请稍候...';
  let status: 'success' | 'error' | 'info' = 'info';

  if (code) {
    title = '授权成功！';
    subTitle = '正在返回...';
    status = 'success';
  } else if (error) {
    title = '授权失败';
    subTitle = error || '未知错误';
    status = 'error';
  }

  return (
    <div className="oauth-callback-page">
      <Result
        status={status}
        title={title}
        subTitle={subTitle}
        icon={status === 'info' ? <Spin size="large" /> : undefined}
      />
    </div>
  );
};

export default OAuthCallback;
