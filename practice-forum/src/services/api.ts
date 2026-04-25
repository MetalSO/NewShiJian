import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

import type { User, Post, Comment, CAFTokenResponse, CAFUserInfo, Message } from '../types';
import { generateRSAKeyPair } from './crypto';

const CAF_BASE_URL = '/api/caf';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface SubServerCredentials {
  clientId: string;
  clientSecret: string;
}

let credentials: SubServerCredentials | null = null;
let isRegistered = false;

const apiClient: AxiosInstance = axios.create({
  baseURL: CAF_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const backendClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

backendClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('Backend API error:', error.message);
    return Promise.reject(error);
  }
);

const getStoredCredentials = (): SubServerCredentials | null => {
  if (credentials) return credentials;
  const stored = localStorage.getItem('caf_credentials');
  if (stored) {
    try {
      credentials = JSON.parse(stored);
      return credentials;
    } catch {
      return null;
    }
  }
  return null;
};

const storeCredentials = (creds: SubServerCredentials) => {
  credentials = creds;
  localStorage.setItem('caf_credentials', JSON.stringify(creds));
};

export const initSubServer = async (): Promise<SubServerCredentials | null> => {
  if (isRegistered) {
    return getStoredCredentials();
  }

  const stored = getStoredCredentials();
  if (stored) {
    isRegistered = true;
    return stored;
  }

  try {
    const { publicKey } = await generateRSAKeyPair();
    
    const response = await apiClient.post('/subserver/register', {
      name: '实践论坛',
      public_key: publicKey,
    });

    const newCredentials: SubServerCredentials = {
      clientId: response.data.id,
      clientSecret: response.data.secret,
    };

    storeCredentials(newCredentials);
    isRegistered = true;
    console.log('SubServer 注册成功');
    return newCredentials;
  } catch (error) {
    console.error('SubServer 注册失败:', error);
    return null;
  }
};

export const getCredentials = async (): Promise<SubServerCredentials> => {
  const creds = await initSubServer();
  if (!creds) {
    throw new Error('SubServer 未注册');
  }
  return creds;
};

export const openOAuthPopup = async (): Promise<string> => {
  const creds = await getCredentials();
  const redirectUri = `${window.location.origin}/oauth/callback`;
  
  const width = 500;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  const authUrl = `https://auth.apoints.cn/web/oauth/authorize?client_id=${creds.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=basic`;

  return new Promise((resolve, reject) => {
    const popup = window.open(
      authUrl,
      'CAF OAuth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error('无法打开授权窗口'));
      return;
    }

    let completed = false;

    const messageHandler = (event: MessageEvent) => {
      if (completed) return;
      
      if (event.data && event.data.type === 'OAUTH_CALLBACK') {
        completed = true;
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        
        if (event.data.code) {
          popup.close();
          resolve(event.data.code);
        } else if (event.data.error) {
          popup.close();
          reject(new Error(event.data.error));
        } else {
          popup.close();
          reject(new Error('授权失败'));
        }
      }
    };

    window.addEventListener('message', messageHandler);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        if (!completed) {
          reject(new Error('用户取消了授权'));
        }
      }
    }, 500);
  });
};

export const exchangeToken = async (code: string): Promise<CAFTokenResponse> => {
  const creds = await getCredentials();
  
  const response = await apiClient.post('/api/oauth/token', {
    grant_type: 'authorization_code',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    code,
  });

  return response.data;
};

export const loginWithOAuth = async (): Promise<{ token: string; user: CAFUserInfo }> => {
  try {
    const code = await openOAuthPopup();
    const tokenResponse = await exchangeToken(code);
    
    localStorage.setItem('token', tokenResponse.access_token);
    
    const userResponse = await apiClient.get('/api/user/info');
    
    return {
      token: tokenResponse.access_token,
      user: userResponse.data,
    };
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (error.message === '用户取消了授权') {
      throw error;
    }
    throw new Error(error.response?.data?.message || error.message || 'OAuth 登录失败');
  }
};

export const getUserInfo = async (): Promise<CAFUserInfo> => {
  const response = await apiClient.get('/api/user/info');
  return response.data;
};

export const getPermissions = async (): Promise<string[]> => {
  const response = await apiClient.get('/api/protocol/permissions');
  return response.data.permissions;
};

export const getInterfaces = async (): Promise<string[]> => {
  const response = await apiClient.get('/api/protocol/interfaces');
  return response.data.interfaces;
};

export const getAuthorizations = async () => {
  const response = await apiClient.get('/api/user/authorizations');
  return response.data.authorizations;
};

export const revokeAuthorization = async (subServerId: string): Promise<void> => {
  await apiClient.delete(`/api/user/authorizations/${subServerId}`);
};

export interface UserSettings {
  bio: string;
  emailOnReply: boolean;
  dmOnLike: boolean;
  weeklyDigest: boolean;
  themeMode: 'light' | 'dark' | 'system';
  themeColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
  language: string;
  timezone: string;
}

export const getUserSettings = async (userId: string): Promise<UserSettings> => {
  const response = await backendClient.get(`/api/settings/${userId}`);
  return response.data;
};

export const saveUserSettings = async (userId: string, settings: Partial<UserSettings>): Promise<UserSettings> => {
  const response = await backendClient.post(`/api/settings/${userId}`, settings);
  return response.data;
};

export const resetUserSettings = async (userId: string): Promise<void> => {
  await backendClient.delete(`/api/settings/${userId}`);
};

export const getThemeList = async (): Promise<{ id: number; name: string; color: string }[]> => {
  const response = await backendClient.get('/api/settings/themes/list');
  return response.data;
};

export const getPosts = async (): Promise<Post[]> => {
  const response = await backendClient.get('/api/posts');
  return response.data;
};

export const getPost = async (id: string): Promise<Post | null> => {
  try {
    const response = await backendClient.get(`/api/posts/${id}`);
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

export const createPost = async (title: string, summary: string, content: string, author: User, cover_image?: string): Promise<Post> => {
  const response = await backendClient.post('/api/posts', {
    id: Date.now().toString(),
    title,
    summary,
    content,
    author_id: author.id,
    author_username: author.username,
    author_avatar: author.avatar,
    cover_image,
  });
  return response.data;
};

export const updatePost = async (id: string, title: string, summary: string, content: string, cover_image?: string): Promise<Post | null> => {
  try {
    const response = await backendClient.put(`/api/posts/${id}`, {
      title,
      summary,
      content,
      cover_image,
    });
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

export const deletePost = async (id: string): Promise<boolean> => {
  try {
    await backendClient.delete(`/api/posts/${id}`);
    return true;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
 } 
};

// 评论相关API
export const getComments = async (postId: string): Promise<Comment[]> => {
  const response = await backendClient.get(`/api/comments/${postId}`);
  return response.data;
};

export const createComment = async (postId: string, content: string, author: User, parent_id?: string): Promise<Comment> => {
  const response = await backendClient.post(`/api/comments/${postId}`, {
    content,
    author_id: author.id,
    author_username: author.username,
    author_avatar: author.avatar,
    parent_id,
  });
  return response.data;
};

export const updateComment = async (commentId: string, content: string, author_id: string): Promise<Comment | null> => {
  try {
    const response = await backendClient.put(`/api/comments/${commentId}`, {
      content,
      author_id,
    });
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

export const deleteComment = async (commentId: string, author_id: string): Promise<boolean> => {
  try {
    await backendClient.delete(`/api/comments/${commentId}`, { data: { author_id } });
    return true;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }
};

// 文章点赞相关API
export const likePost = async (postId: string, user: User): Promise<Post | null> => {
  try {
    const response = await backendClient.post(`/api/posts/${postId}/like`, {
      user_id: user.id,
      username: user.username,
    });
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

export const unlikePost = async (postId: string, user: User): Promise<Post | null> => {
  try {
    const response = await backendClient.post(`/api/posts/${postId}/unlike`, {
      user_id: user.id,
      username: user.username,
    });
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

export const likeComment = async (commentId: string, user: User): Promise<Comment | null> => {
  try {
    const response = await backendClient.post(`/api/comments/${commentId}/like`, {
      user_id: user.id,
      username: user.username,
    });
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

export const unlikeComment = async (commentId: string, user: User): Promise<Comment | null> => {
  try {
    const response = await backendClient.post(`/api/comments/${commentId}/unlike`, {
      user_id: user.id,
      username: user.username,
    });
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

// 举报相关API
export const createReport = async (
  reporter: User,
  target_type: 'post' | 'comment',
  target_id: string,
  reason: string
): Promise<any> => {
  try {
    const response = await backendClient.post('/api/reports', {
      reporter_id: reporter.id,
      reporter_username: reporter.username,
      target_type,
      target_id,
      reason,
    });
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

// 消息相关API
export const getMessages = async (userId: string, options?: { unread_only?: boolean, type?: string }): Promise<Message[]> => {
  try {
    const params = new URLSearchParams();
    if (options?.unread_only) params.append('unread_only', 'true');
    if (options?.type) params.append('type', options.type);
    
    const response = await backendClient.get(`/api/messages/${userId}?${params.toString()}`);
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return [];
  }
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const response = await backendClient.get(`/api/messages/${userId}/unread-count`);
    return response.data.count;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return 0;
  }
};

export const markMessageAsRead = async (messageId: string): Promise<Message | null> => {
  try {
    const response = await backendClient.post(`/api/messages/${messageId}/read`);
    return response.data;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return null;
  }
};

export const markAllMessagesAsRead = async (userId: string): Promise<boolean> => {
  try {
    await backendClient.post(`/api/messages/${userId}/read-all`);
    return true;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }
};

export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    await backendClient.delete(`/api/messages/${messageId}`);
    return true;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }
};

// 检查点赞状态
export const checkPostLikeStatus = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const response = await backendClient.get(`/api/posts/${postId}/like-status?user_id=${userId}`);
    return response.data.liked;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }
};

export const checkCommentLikeStatus = async (commentId: string, userId: string): Promise<boolean> => {
  try {
    const response = await backendClient.get(`/api/comments/${commentId}/like-status?user_id=${userId}`);
    return response.data.liked;
  } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return false;
  }
};

export default apiClient;
export { CAF_BASE_URL, API_BASE_URL };
