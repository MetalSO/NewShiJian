export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
}

export interface Post {
  id: string;
  title: string;
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

export interface CAFTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface CAFUserInfo {
  id: string;
  username: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export interface CAFAuthorization {
  sub_server_id: string;
  sub_server_name: string;
  permissions: string[];
  authorized_at: string;
}

export interface UserSettings {
  bio: string;
  emailOnReply: boolean;
  dmOnLike: boolean;
  weeklyDigest: boolean;
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  language: string;
  timezone: string;
}

export interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_username: string;
  author_avatar?: string;
  created_at: string;
  updated_at?: string;
  likes?: number;
}

export type Message = {
  id: string;
  sender_id: string;
  sender_username: string;
  receiver_id: string;
  receiver_username: string;
  type: 'reply' | 'like' | 'system' | 'mention';
  target_type?: 'post' | 'comment';
  target_id?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  post_title?: string;
  comment_preview?: string;
};

export const __FOR_TESTING = 'test';
