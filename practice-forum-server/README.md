# 实践论坛后端 (practice-forum-server)

基于 Node.js + Express + PostgreSQL + WebSocket 的后端 API 服务。

## 功能概览

- 帖子 CRUD（含点赞/取消点赞/点赞状态）
- 评论 CRUD（含楼中楼、点赞相关接口）
- 举报管理（创建、查询、状态更新、删除）
- 用户设置读取、保存、重置、主题列表
- 站内消息（列表、未读数、已读、批量已读、删除）
- CAF 代理转发（`/api/caf/*`）
- WebSocket 用户在线连接与定向推送

## 快速开始

### 1. 安装依赖

```bash
cd practice-forum-server
npm install
```

### 2. 配置数据库

复制 `.env.example` 为 `.env`，并修改数据库配置：

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=practice_forum
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5174

# 可选：CAF服务地址（默认 https://auth.apoints.cn）
CAF_BASE_URL=https://auth.apoints.cn
```

### 3. 创建数据库

```sql
CREATE DATABASE practice_forum;
```

### 4. 初始化数据表

```bash
npm run init-db
```

或启动服务时会自动初始化：

```bash
npm run dev
```

说明：服务启动时会自动执行初始化逻辑，包括建表、补充缺失列、插入默认主题等。

### 5. 启动服务

```bash
# 开发模式 (自动重载)
npm run dev

# 生产模式
npm run build
npm start
```

默认地址：`http://localhost:3001`

健康检查：`GET /api/health`

## API 接口

以下为主要接口分组（均以 `/api` 为前缀）：

### 健康检查
- `GET /health` - 检查服务状态

### 帖子
- `GET /posts` - 获取所有帖子
- `GET /posts/:id` - 获取单个帖子
- `POST /posts` - 创建帖子
- `PUT /posts/:id` - 更新帖子
- `DELETE /posts/:id` - 删除帖子
- `POST /posts/:id/like` - 点赞帖子
- `POST /posts/:id/unlike` - 取消点赞帖子
- `GET /posts/:id/like-status?user_id=xxx` - 查询帖子点赞状态

### 评论
- `GET /comments/:postId` - 获取帖子评论
- `POST /comments/:postId` - 发表评论/回复评论
- `PUT /comments/:commentId` - 编辑评论
- `DELETE /comments/:commentId` - 删除评论
- `POST /comments/:commentId/like` - 点赞评论
- `POST /comments/:commentId/unlike` - 取消点赞评论
- `GET /comments/:commentId/like-status?user_id=xxx` - 查询评论点赞状态

### 举报
- `POST /reports` - 创建举报
- `GET /reports` - 获取举报列表（支持查询参数）
- `PUT /reports/:id` - 更新举报状态
- `DELETE /reports/:id` - 删除举报

### 消息
- `GET /messages/:userId` - 获取消息列表（支持 `type`、`unread_only` 查询）
- `GET /messages/:userId/unread-count` - 获取未读消息数
- `POST /messages/:messageId/read` - 标记单条已读
- `POST /messages/:userId/read-all` - 标记全部已读
- `DELETE /messages/:messageId` - 删除消息
- `POST /messages` - 发送消息

### 用户设置
- `GET /settings/:userId` - 获取用户设置
- `POST /settings/:userId` - 保存用户设置
- `DELETE /settings/:userId` - 重置用户设置
- `GET /settings/themes/list` - 获取主题列表

### CAF 代理
- `ALL /caf/*` - 代理转发到 CAF 服务

## 数据库表

服务启动会自动初始化以下表结构：

- `posts`
- `comments`
- `likes`
- `reports`
- `messages`
- `user_settings`
- `themes`

### posts (帖子表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(255) | 主键 |
| title | VARCHAR(500) | 标题 |
| content | TEXT | 内容 |
| author_id | VARCHAR(255) | 作者ID |
| author_username | VARCHAR(255) | 作者用户名 |
| author_avatar | VARCHAR(500) | 作者头像 |
| cover_image | VARCHAR(500) | 封面图 |
| likes | INTEGER | 点赞数 |
| views | INTEGER | 浏览数 |
| created_at | TIMESTAMP WITH TIME ZONE | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新时间 |

### user_settings (用户设置表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| user_id | VARCHAR(255) | 用户ID (唯一) |
| bio | TEXT | 个人简介 |
| email_on_reply | BOOLEAN | 邮件通知 |
| dm_on_like | BOOLEAN | 点赞通知 |
| weekly_digest | BOOLEAN | 每周精选 |
| theme_mode | VARCHAR(20) | 主题模式 |
| theme_color | VARCHAR(20) | 主题颜色 |
| density | VARCHAR(20) | 内容密度 |
| language | VARCHAR(20) | 语言 |
| timezone | VARCHAR(100) | 时区 |
| created_at | TIMESTAMP WITH TIME ZONE | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新时间 |

## WebSocket

- 连接地址：`ws://localhost:3001`
- 客户端建立连接后需发送认证消息：

```json
{ "type": "auth", "userId": "用户ID" }
```

服务端将用户与连接关联后，可进行定向推送（后端内部通过 `broadcastToUser`）。

## 技术栈

- **Express** - Web 框架
- **PostgreSQL** - 数据库
- **pg** - PostgreSQL 客户端
- **ws** - WebSocket 服务
- **CORS** - 跨域支持
- **dotenv** - 环境变量

## 常用命令

- `npm run dev`：开发模式（tsx watch）
- `npm run init-db`：单独初始化数据库结构
- `npm run build`：编译到 `dist/`
- `npm start`：运行生产构建

## 常见问题

1. 数据库连接失败

- 检查 `.env` 中数据库连接配置
- 检查 PostgreSQL 服务是否运行

2. 前端跨域报错

- 默认允许本地 `5173/5174/3001` 端口
- 确保前端运行在允许的端口上

3. OAuth 代理请求失败

- 检查外网访问能力
- 检查 `CAF_BASE_URL` 是否可达
