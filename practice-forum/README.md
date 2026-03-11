# 实践论坛前端 (practice-forum)

基于 React + TypeScript + Vite + Ant Design 的论坛前端项目，支持 CAF OAuth 登录、帖子与评论、私信、主题与阅读偏好设置等功能。

## 功能特性

- CAF OAuth 登录与授权回调
- 帖子列表、发帖、编辑、详情查看
- 评论系统（支持楼中楼）
- 私信页面与 WebSocket 实时消息
- 个人资料页与用户设置页
- 主题色切换、阅读密度与本地偏好管理

## 技术栈

- React 19
- TypeScript 5
- Vite 7
- React Router 7
- Ant Design 6
- Axios
- pdfjs-dist（PDF 相关能力）

## 目录结构（前端）

```text
practice-forum/
  src/
    components/        # 业务组件（上传、评论、布局等）
    context/           # 认证、主题、阅读偏好上下文
    pages/             # 页面模块（Home/Login/PostDetail 等）
    router/            # 路由配置
    services/          # API 与加密服务
    types/             # 类型定义
```

## 环境要求

- Node.js >= 18
- npm >= 9

## 环境变量

复制 `.env.example` 为 `.env`：

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

`.env.example` 默认内容：

```env
# CAF Server 配置
VITE_CAF_BASE_URL=https://auth.apoints.cn

# 当前应用配置
VITE_APP_NAME=实践论坛
VITE_APP_CLIENT_ID=practice-forum
```

可选项（若需要指定后端地址）：

```env
VITE_API_BASE_URL=http://localhost:3001
```

## 快速开始

### 1. 安装前端依赖

```bash
cd practice-forum
npm install
```

### 2. 启动前端开发环境

```bash
npm run dev
```

默认访问地址：`http://localhost:5173`

## 与后端联调

后端位于 `../practice-forum-server`，默认地址为 `http://localhost:3001`。

### 方式一：分别启动（推荐排错）

```bash
# 终端1：前端
cd practice-forum
npm run dev

# 终端2：后端
cd practice-forum-server
npm install
npm run dev
```

### 方式二：前端目录一键启动前后端

```bash
cd practice-forum
npm run dev:all
```

## 常用脚本

- `npm run dev`：启动前端开发服务器
- `npm run dev:all`：并行启动前后端（需后端依赖已安装）
- `npm run build`：类型检查并构建
- `npm run lint`：执行 ESLint
- `npm run preview`：预览构建产物

## 相关后端说明

后端项目包含 PostgreSQL 初始化、REST API 与 WebSocket 消息推送。

详细配置与接口说明请查看：`../practice-forum-server/README.md`

---

## 附录：原始 Vite 模板说明（保留）

本项目最初基于 React + TypeScript + Vite 模板创建，模板说明中提及：

- 官方 React 插件：`@vitejs/plugin-react` / `@vitejs/plugin-react-swc`
- React Compiler 支持
- ESLint 类型感知规则扩展建议

如需查看模板原始内容，可参考 Vite 官方模板文档。
