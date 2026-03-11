# 实践论坛（全栈）

本仓库包含一个论坛系统的前后端实现：

- 前端：React + TypeScript + Vite + Ant Design
- 后端：Node.js + Express + PostgreSQL + WebSocket

项目支持 CAF OAuth 登录、发帖评论、点赞、举报、站内消息与用户设置等能力。

## 仓库结构

```text
ShiJian/
  practice-forum/           # 前端项目
  practice-forum-server/    # 后端项目
  CAFPAPI.md                # CAF API 相关文档
  protocol.md               # 协议文档
  适配.md                   # 适配说明
```

## 快速开始

### 1. 安装依赖

```bash
# 前端
cd practice-forum
npm install

# 后端
cd ../practice-forum-server
npm install
```

### 2. 配置环境变量

前端：复制 `practice-forum/.env.example` 为 `practice-forum/.env`。

后端：复制 `practice-forum-server/.env.example` 为 `practice-forum-server/.env`，并配置 PostgreSQL 连接信息。

Windows PowerShell 示例：

```powershell
Copy-Item practice-forum/.env.example practice-forum/.env
Copy-Item practice-forum-server/.env.example practice-forum-server/.env
```

### 3. 准备数据库

- 确保本机 PostgreSQL 已运行
- 创建数据库：`practice_forum`

```sql
CREATE DATABASE practice_forum;
```

### 4. 启动项目

方式一：分别启动（推荐）

```bash
# 终端1：后端
cd practice-forum-server
npm run dev

# 终端2：前端
cd practice-forum
npm run dev
```

方式二：在前端目录一键并行启动（要求后端依赖已安装）

```bash
cd practice-forum
npm run dev:all
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 文档入口

- 前端说明：`practice-forum/README.md`
- 后端说明：`practice-forum-server/README.md`
- CAF 接口文档：`CAFPAPI.md`
- 协议文档：`protocol.md`
- 适配说明：`适配.md`

## 常见问题

1. 前端启动后请求失败

- 检查后端是否运行在 `3001` 端口
- 检查前端 `VITE_API_BASE_URL` 是否正确

2. 后端启动时报数据库连接错误

- 检查 `practice-forum-server/.env` 中 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD`
- 检查 PostgreSQL 服务状态

3. OAuth 登录失败

- 检查网络是否可访问 CAF 服务
- 检查回调地址是否与前端运行地址一致（`/oauth/callback`）
