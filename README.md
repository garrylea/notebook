# Smart Notepad

## 项目介绍
Smart Notepad 是一个智能记事本应用，支持前后端分离架构，提供用户注册、登录、笔记管理等功能。

## 服务启动指南

本项目基于 npm workspaces 构建，包含前端（`apps/frontend`）和后端（`apps/backend`）两个子项目。
由于单条命令执行 `npm run dev --workspaces` 可能会遇到阻塞等待的问题，**强烈建议开启两个终端窗口**分别启动前后端服务。

### 运行前准备

在初次运行项目前，请确保已经在最外层**根目录**安装了所有依赖：
```bash
npm install
```

---

### 第一步：启动后端服务

开启**第一个**终端窗口，按照以下步骤操作：

```bash
# 1. 切换到后端目录
cd apps/backend

# 2. 如果你是第一次运行，需要推送并生成 Prisma 数据库客户端
npm run db:push
npm run db:generate

# 3. 启动后端开发服务器（基于 tsx watch 热更新）
npm run dev
```
后端服务启动后，可以查阅控制台日志确认运行端口（以及是否需要配置 `.env` 环境变量）。

---

### 第二步：启动前端服务

开启**第二个**终端窗口，按照以下步骤操作：

```bash
# 1. 切换到前端目录
cd apps/frontend

# 2. 启动前端开发服务器（基于 Vite）
npm run dev
```
启动成功后，Vite 会在控制台打印出本地访问的 URL（通常为 `http://localhost:5173`），在浏览器中打开该地址即可访问 Smart Notepad 前端界面。
