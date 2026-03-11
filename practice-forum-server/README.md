# 实践论坛后端 (practice-forum-server)

基于 Node.js + PostgreSQL 的后端 API 服务。

## 快速开始

### 1. 安装依赖

```bash
cd practice-forum-server
npm install
```

### 2. 配置数据库

复制 `.env.example` 为 `.env`，并修改数据库配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=practice_forum
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5174
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

### 5. 启动服务

```bash
# 开发模式 (自动重载)
npm run dev

# 生产模式
npm run build
npm start
```

## API 接口

### 健康检查
- `GET /api/health` - 检查服务状态

### 帖子
- `GET /api/posts` - 获取所有帖子
- `GET /api/posts/:id` - 获取单个帖子
- `POST /api/posts` - 创建帖子
- `PUT /api/posts/:id` - 更新帖子
- `DELETE /api/posts/:id` - 删除帖子

### 用户设置
- `GET /api/settings/:userId` - 获取用户设置
- `POST /api/settings/:userId` - 保存用户设置
- `DELETE /api/settings/:userId` - 重置用户设置

## 数据库表

### posts (帖子表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(255) | 主键 |
| title | VARCHAR(255) | 标题 |
| content | TEXT | 内容 |
| author_id | VARCHAR(255) | 作者ID |
| author_username | VARCHAR(255) | 作者用户名 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### user_settings (用户设置表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL | 主键 |
| user_id | VARCHAR(255) | 用户ID (唯一) |
| bio | TEXT | 个人简介 |
| email_on_reply | BOOLEAN | 邮件通知 |
| dm_on_like | BOOLEAN | 点赞通知 |
| weekly_digest | BOOLEAN | 每周精选 |
| theme | VARCHAR(50) | 主题模式 |
| density | VARCHAR(50) | 内容密度 |
| language | VARCHAR(20) | 语言 |
| timezone | VARCHAR(100) | 时区 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 技术栈

- **Express** - Web 框架
- **PostgreSQL** - 数据库
- **pg** - PostgreSQL 客户端
- **CORS** - 跨域支持
- **dotenv** - 环境变量
