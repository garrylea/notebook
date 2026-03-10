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

## 线上部署指南 (Production Deployment)

本项目推荐使用 Docker Compose 进行生产环境的自动化部署。部署架构包含三个核心容器：
- `postgres`: PostgreSQL 数据库服务
- `backend`: 基于 Fastify 和 Prisma 的 Node.js 后端服务（附带自动化数据库迁移脚本）
- `frontend`: 基于 Nginx 承载构建后的 Vite 静态资源

### 1. 环境依赖准备
请确保生产服务器上已成功安装：
- **Docker** (推荐 20.10+ 版本)
- **Docker Compose** (推荐 V2 版本)
- **Git** (用于拉取代码)

### 2. 获取代码与环境配置
在您的生产服务器上克隆本仓库并进入根目录：

```bash
# 获取代码库
git clone <your-repo-url> smart-notepad
cd smart-notepad

# 从示例文件复制出生产环境变量配置文件
cp .env.example .env
```

**极其重要：** 使用文本编辑器（如 `vim .env`）修改生产环境变量。出于安全性考虑，请务必更改以下默认配置：
- `POSTGRES_PASSWORD`: 设置数据库强密码
- `JWT_ACCESS_SECRET` 和 `JWT_REFRESH_SECRET`: 替换为安全的随机长字符串（推荐至少64个字符）

### 3. 一键构建与启动
在项目根目录下（即 `docker-compose.yml` 所在目录），运行下述指令即可完成“镜像构建”、“数据库启动”、“自动执行生产迁移脚本 (`npx prisma migrate deploy`)” 以及“拉起所有服务”等完整流程：

```bash
docker compose up -d --build
```

### 4. 验证服务状态
可以通过命令查看各个容器的运行状态和实时日志流：

```bash
# 查看容器状态是否均为 Up / healthy
docker compose ps

# 查看实时日志（可使用 Ctrl+C 退出跟随模式）
docker compose logs -f
```

服务正常启动完成后：
- **客户端（前端应用）**：通过浏览器访问 `http://<服务器公网 IP 或者域名>` （默认映射在主机 `80` 端口）。
- **服务端（后端 API）**：运行并映射在主机的 `3000` 端口，前端基于构建参数 `VITE_API_BASE_URL` 的注入自动与之通信。

### 5. 容器停启与数据持久化
系统核心业务数据（PostgreSQL 数据库数据）及用户数据（上传附件文件）均使用 Docker Volume（`pg_data` 和 `uploads_data`）进行了持久化隔离管理，保证了应用在停止迭代或重启时数据不会丢失。

- 暂时停止但不销毁容器：
  ```bash
  docker compose stop
  ```
- 重新启动已暂停的容器：
  ```bash
  docker compose start
  ```
- 停止服务并销毁相关网络与容器资源（**不**删除持久化数据卷）：
  ```bash
  docker compose down
  ```

---

## 线上部署指南 (手动部署 / Non-Docker)

如果您不希望使用 Docker，也可以选择在服务器上直接安装环境并手动部署前后端应用。

### 1. 环境依赖准备
请确保生产服务器上已安装以下核心依赖：
- **Node.js**: 推荐 v20+ 长期支持版 (LTS)
- **PostgreSQL**: 推荐 16+ 版本
- **Git**: 用于拉取和管理代码
- **进程管理工具**: 如 PM2，可通过执行 `npm install -g pm2` 安装
- **Web 服务器**: 如 Nginx，用于直接代理前端静态页面与反向代理后端 API

### 选项 A：使用一键部署脚本 (推荐)

项目内置了一个能够自动配置数据库与后台进程的自动化部署脚本，可在一键下完成所有流程。

1. **获取代码与配置** (请确保服务器有 Git 即可):
   ```bash
   git clone <your-repo-url> smart-notepad
   cd smart-notepad
   # 复制并配置环境，设置你想要的密码或端口
   cp .env.example .env
   vim .env
   ```
2. **执行部署脚本**:
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```
   **脚本会自动执行以下所有步骤：**
   - 🐘 检查并自动安装 PostgreSQL (如果服务器没有)。
   - 🔒 根据 `.env` 里的配置项安全地**自动创建数据库和对应的账号密码**，并测试连接连通性。
   - ⚙️ 安装 PM2 管理器、拉取依赖 (npm install)。
   - 🛠️ 自动执行 `npx prisma migrate deploy` 建表，打包前后端应用并拉起 Node.js 后台。

5. **配置 Nginx 代理**: 前后端打包启动就绪后，最后一步只需配置如下 Nginx 即可对外服务（见文末的 **Nginx 代理配置参考**）。

---

### 选项 B：完全手动逐步部署
*(如果您希望自己逐块控制每个部署流程)*

**1. 初始化与获取代码** 等同上文流程，并配置 `.env`
**2. 安装依赖**: `npm install`

**3. 服务端 (Backend) 部署**
1. 进入后端目录：
   ```bash
   cd apps/backend
   ```
2. 执行 Prisma 生产数据库迁移：
   ```bash
   npx prisma migrate deploy
   ```
3. 构建后端 TypeScript 代码为 JavaScript：
   ```bash
   npm run build
   ```
4. 使用 PM2 在后台运行：
   ```bash
   pm2 start dist/index.js --name "smart-notepad-api"
   pm2 save
   ```

**4. 客户端 (Frontend) 部署**
1. 切换回前端目录：`cd ../../apps/frontend`
   *(如有需要，可在 build 前注入环境变量，如 Linux 下执行 `VITE_API_BASE_URL=/api npm run build`)*
2. 执行构建：`npm run build`
3. 托管：最终文件在 `apps/frontend/dist`，将其通过下方的 Nginx 代理做静态资源分发。

### 6. Nginx 代理配置参考
编辑服务器上的 Nginx 配置文件（如 `/etc/nginx/sites-available/smart-notepad`）：

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;

    # 1. 托管前端静态页面
    location / {
        root /path/to/smart-notepad/apps/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 2. 反向代理到内部真实运行的 Node.js 后端应用 (运行在 3000 端口)
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
配置完成后重启 Nginx 服务即可生效（`sudo systemctl restart nginx`）。访问指定的公网 IP 或域名，即可正常使用 Smart Notepad。

