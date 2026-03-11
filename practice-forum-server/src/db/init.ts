import pool from './pool';

const checkDatabaseSQL = `
SELECT 1 FROM pg_database WHERE datname = 'practice_forum';
`;

const getCreateDatabaseSQL = () => `
CREATE DATABASE practice_forum;
`;

const createTablesSQL = `
-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT DEFAULT '',
    email_on_reply BOOLEAN DEFAULT true,
    dm_on_like BOOLEAN DEFAULT true,
    weekly_digest BOOLEAN DEFAULT false,
    theme_mode VARCHAR(20) DEFAULT 'system',
    theme_color VARCHAR(20) DEFAULT 'blue',
    density VARCHAR(20) DEFAULT 'comfortable',
    language VARCHAR(20) DEFAULT 'zh-CN',
    timezone VARCHAR(100) DEFAULT 'Asia/Shanghai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 主题配置表
CREATE TABLE IF NOT EXISTS themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, color)
);

-- 帖子表
CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    author_username VARCHAR(255) NOT NULL,
    author_avatar VARCHAR(500),
    cover_image VARCHAR(500),
    likes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) PRIMARY KEY,
    post_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(255) NOT NULL,
    author_username VARCHAR(255) NOT NULL,
    author_avatar VARCHAR(500),
    likes INTEGER DEFAULT 0,
    parent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 举报表
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(255) PRIMARY KEY,
    reporter_id VARCHAR(255) NOT NULL,
    reporter_username VARCHAR(255) NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 点赞记录表
CREATE TABLE IF NOT EXISTS likes (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment')),
    target_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);

-- 站内消息表
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(255) PRIMARY KEY,
    sender_id VARCHAR(255) NOT NULL,
    sender_username VARCHAR(255) NOT NULL,
    receiver_id VARCHAR(255) NOT NULL,
    receiver_username VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('reply', 'like', 'system', 'mention')),
    target_type VARCHAR(20) CHECK (target_type IN ('post', 'comment')),
    target_id VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const insertDefaultThemesSQL = `
INSERT INTO themes (name, color, is_default) VALUES
('蓝色', 'blue', true),
('绿色', 'green', false),
('紫色', 'purple', false),
('红色', 'red', false),
('橙色', 'orange', false),
('青色', 'cyan', false);
`;

async function ensureTableColumns() {
  // user_settings 表缺失字段
  const userSettingsColumns = [
    { table: 'user_settings', name: 'theme_mode', type: 'VARCHAR(20) DEFAULT \'system\'' },
    { table: 'user_settings', name: 'theme_color', type: 'VARCHAR(20) DEFAULT \'blue\'' },
    { table: 'user_settings', name: 'density', type: 'VARCHAR(20) DEFAULT \'comfortable\'' },
    { table: 'user_settings', name: 'language', type: 'VARCHAR(20) DEFAULT \'zh-CN\'' },
    { table: 'user_settings', name: 'timezone', type: 'VARCHAR(100) DEFAULT \'Asia/Shanghai\'' },
    { table: 'user_settings', name: 'bio', type: 'TEXT DEFAULT \'\'' },
    { table: 'user_settings', name: 'email_on_reply', type: 'BOOLEAN DEFAULT true' },
    { table: 'user_settings', name: 'dm_on_like', type: 'BOOLEAN DEFAULT true' },
    { table: 'user_settings', name: 'weekly_digest', type: 'BOOLEAN DEFAULT false' },
  ];
  
  // posts 表缺失字段
  const postsColumns = [
    { table: 'posts', name: 'author_avatar', type: 'VARCHAR(500)' },
    { table: 'posts', name: 'cover_image', type: 'VARCHAR(500)' },
    { table: 'posts', name: 'likes', type: 'INTEGER DEFAULT 0' },
    { table: 'posts', name: 'views', type: 'INTEGER DEFAULT 0' },
  ];
  
  // comments 表缺失字段
  const commentsColumns = [
    { table: 'comments', name: 'parent_id', type: 'VARCHAR(255)' },
  ];
  
  const allColumns = [...userSettingsColumns, ...postsColumns, ...commentsColumns];
  
  for (const column of allColumns) {
    try {
      await pool.query(`ALTER TABLE ${column.table} ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`);
      console.log(`✅ 已确保表 ${column.table} 的列 ${column.name} 存在`);
    } catch (error: any) {
      console.log(`表 ${column.table} 的列 ${column.name} 可能已存在:`, error.message);
    }
  }
  
  // 创建索引（确保字段存在后再创建）
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id)');
    console.log('✅ 已确保索引 idx_comments_parent_id 存在');
  } catch (error: any) {
    console.log('索引 idx_comments_parent_id 可能已存在或无法创建:', error.message);
  }
  
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id)');
    console.log('✅ 已确保索引 idx_reports_target 存在');
  } catch (error: any) {
    console.log('索引 idx_reports_target 可能已存在或无法创建:', error.message);
  }
  
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)');
    console.log('✅ 已确保索引 idx_reports_status 存在');
  } catch (error: any) {
    console.log('索引 idx_reports_status 可能已存在或无法创建:', error.message);
  }
  
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read, created_at)');
    console.log('✅ 已确保索引 idx_messages_receiver 存在');
  } catch (error: any) {
    console.log('索引 idx_messages_receiver 可能已存在或无法创建:', error.message);
  }
  
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id)');
    console.log('✅ 已确保索引 idx_likes_target 存在');
  } catch (error: any) {
    console.log('索引 idx_likes_target 可能已存在或无法创建:', error.message);
  }
}

export const initDatabase = async () => {
  try {
    console.log('正在检查数据库...');
    
    try {
      await pool.query(checkDatabaseSQL);
    } catch {
      console.log('正在创建数据库 practice_forum...');
      await pool.query(getCreateDatabaseSQL());
      console.log('数据库创建成功！');
    }
    
    console.log('正在创建数据表...');
    await pool.query(createTablesSQL);
    
    console.log('正在检查并添加缺失...列');
    await ensureTableColumns();
    
    console.log('正在清理重复主题...');
    await pool.query('DELETE FROM themes;');
    
    console.log('正在插入预设主题...');
    await pool.query(insertDefaultThemesSQL);
    
    console.log('✅ 数据库初始化完成！');
    console.log('   - user_settings 表 (用户设置)');
    console.log('   - themes 表 (主题配置)');
    
    return true;
  } catch (error) {
    console.error('❌ 初始化数据库失败:', error);
    throw error;
  }
};

export const ensureUserSettings = async (userId: string) => {
  await pool.query(
    `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
};



export default { initDatabase, ensureUserSettings };
