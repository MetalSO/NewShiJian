# 实践论坛（全栈）

一个基于 CAF OAuth 的论坛系统，包含前后端两部分：

- 前端：React 19 + TypeScript + Vite 7 + Ant Design 6 + Vditor
- 后端：Node.js + Express + PostgreSQL + Multer + WebSocket

支持 OAuth 登录、发帖/评论、点赞、举报、站内消息、用户设置、Markdown 编辑和图片上传。

## 仓库结构

```text
ShiJian/
  practice-forum/           # 前端项目
  practice-forum-server/    # 后端项目
  CAFPAPI.md                # CAF API 文档
  protocol.md               # 协议文档
  适配.md                   # 适配说明
```

## 环境要求

- Node.js >= 18
- npm >= 9
- PostgreSQL（本地可连接）

## 快速开始

### 1. 安装依赖

```bash
cd practice-forum
npm install

cd ../practice-forum-server
npm install
```

### 2. 手动创建环境变量文件

当前仓库没有可直接复制的 `.env.example`，请手动创建以下文件。

前端：`practice-forum/.env`

```env
VITE_CAF_BASE_URL=https://auth.apoints.cn
VITE_APP_NAME=实践论坛
VITE_APP_CLIENT_ID=practice-forum

# 可选：覆盖后端地址（默认 http://localhost:3001）
# VITE_API_BASE_URL=http://localhost:3001
```

后端：`practice-forum-server/.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3001
CAF_BASE_URL=https://auth.apoints.cn
```

说明：

- 后端当前实际读取的数据库变量是 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD`。
- `DB_NAME` 在当前代码中未被读取（即使配置了也不会生效）。

### 3. 启动项目

方式一：分别启动（推荐）

```bash
# 终端1：后端
cd practice-forum-server
npm run dev

# 终端2：前端
cd practice-forum
npm run dev
```

方式二：前端目录一键并行启动

```bash
cd practice-forum
npm run dev:all
```

默认访问地址：

- 前端：`http://localhost:5173`
- 后端 HTTP：`http://localhost:3001`
- 后端 WebSocket：`ws://localhost:3001`

## 当前已启用能力（与代码一致）

- Markdown 编辑器：Vditor（发帖页）
- 图片上传接口：`POST /api/uploads/images`
- 上传大小限制：单文件 10MB
- 图片访问路径：`/uploads/images/<filename>`

## 常用命令

前端 `practice-forum`：

- `npm run dev`
- `npm run dev:all`
- `npm run build`
- `npm run lint`

后端 `practice-forum-server`：

- `npm run dev`
- `npm run init-db`
- `npm run build`
- `npm start`

## 文档入口

- 前端说明：`practice-forum/README.md`
- 后端说明：`practice-forum-server/README.md`
- CAF 接口文档：`CAFPAPI.md`
- 协议文档：`protocol.md`
- 适配说明：`适配.md`

## 常见问题

1. 前端请求失败

- 确认后端已运行在 `3001`
- 确认 `VITE_API_BASE_URL`（如有配置）指向正确地址

2. 数据库连接失败

- 检查 `practice-forum-server/.env` 中 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD`
- 检查 PostgreSQL 服务是否正常运行

3. OAuth 登录失败

- 检查本机网络是否可访问 CAF 服务
- 确认回调页为 `/oauth/callback`，并与前端地址一致
