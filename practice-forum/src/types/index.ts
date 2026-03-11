// 用户类型
export interface User {
  id: string;
  username: string;
}

// 帖子类型
export interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

// 登录/注册请求
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

// CAF协议相关类型
export interface CAFTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CAFUserInfo {
  id: string;
  username: string;
}

export interface CAFAuthorization {
  sub_server_id: string;
  sub_server_name: string;
  permissions: string[];
}
