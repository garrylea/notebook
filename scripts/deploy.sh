#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "========================================="
echo "  🚀 Smart Notepad Automated Deployment  "
echo "========================================="

# Check for stop command
if [ "$1" == "stop" ]; then
    echo "🛑 正在停止 Smart Notepad 服务..."
    
    # Stop backend process
    if pm2 describe "smart-notepad-api" &> /dev/null; then
        echo "   👉 停止后端 API 服务..."
        pm2 stop "smart-notepad-api"
        pm2 delete "smart-notepad-api"
    else
        echo "   ✅ 后端 API 服务未运行"
    fi
    
    # Stop frontend process if running
    if pm2 describe "smart-notepad-web" &> /dev/null; then
        echo "   👉 停止前端 Web 服务..."
        pm2 stop "smart-notepad-web"
        pm2 delete "smart-notepad-web"
    else
        echo "   ✅ 前端 Web 服务未运行"
    fi
    
    # Save PM2 process list
    pm2 save
    
    echo ""
    echo "========================================="
    echo "✅ Smart Notepad 服务已停止！"
    echo "========================================="
    exit 0
fi

# 1. Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 配置文件，正在自动从 .env.example 复制..."
    cp .env.example .env
    echo "❌ 警告: 请使用 vim .env 修改关键配置信息(数据库连接与密码)，修改后再重新运行此部署脚本本!"
    exit 1
fi

# Load environment variables from .env
echo "🔄 加载 .env 环境变量配置（包含前后端端口等）..."
set -a
source .env
set +a
echo "✅ 环境配置已就绪 (.env 存在)"

# 2. Check PM2 installation
if ! command -v pm2 &> /dev/null; then
    echo "⚙️  PM2 未安装，准备通过 npm 全局安装 pm2..."
    npm install -g pm2
else
    echo "✅ PM2 已安装"
fi

# 3. Database Initialization and Connection Check
echo "🐘 正在执行数据库环境自检与初始化脚本..."
chmod +x scripts/init-db.sh
./scripts/init-db.sh

# 4. Pull latest code (if in git)
# Uncomment the following lines if you want the script to automatically pull from main:
# echo "⏬ 正在拉取远程代码..."
# git pull origin main

# 5. Install all dependencies
echo "📦 正在安装所有项目模块依赖 (使用 npmmirror 加速)..."
npm install --registry=https://registry.npmmirror.com --loglevel info

# 5. Build and Deploy Backend
echo "🛠️  开始部署后端项目 (Backend)..."
cd apps/backend
echo "  👉 执行生产级数据库表结构迁移..."
npx prisma migrate deploy
echo "  👉 编译 Node.js / TypeScript 代码..."
npm run build
echo "  👉 重启或拉起 PM2 后台进程..."
# Restart if existing, otherwise start new
if pm2 describe "smart-notepad-api" &> /dev/null; then
    pm2 restart "smart-notepad-api" --update-env
else
    pm2 start dist/index.js --name "smart-notepad-api"
fi
# Save pm2 process list to start automatically on system boot
pm2 save
cd ../..

# 6. Build Frontend
echo "🛠️  开始部署前端项目 (Frontend)..."
cd apps/frontend
echo "  👉 编译 Vite / React 静态页面资源..."
npm run build
cd ../..

# 7. Frontend Hosting Selection
echo "========================================="
echo "  🌐 前端托管方式选择"
echo "========================================="
echo "请选择如何对外暴露前端（静态网页）服务："
echo "  1) Node.js (使用 serve 包配合 PM2 守护，最轻量快捷)"
echo "  2) Nginx (企业级反向代理，需要系统 root 权限配置)"
echo "  3) 仅构建不托管 (我将自行处理部署)"
read -p "请输入对应的数字 [1-3] (回车默认使用 1): " HOST_CHOICE

HOST_CHOICE=${HOST_CHOICE:-1}
FRONTEND_PORT=${VITE_PORT:-8080}

if [ "$HOST_CHOICE" == "1" ]; then
    echo "⚙️ 选择 1: 使用 Node.js (Express Proxy) 托管..."
    
    # Check if a PM2 process for frontend already exists
    if pm2 describe "smart-notepad-web" &> /dev/null; then
        echo "   👉 重启现有的前端 PM2 进程..."
        # Stop and delete old serve process if it existed
        pm2 delete "smart-notepad-web" &> /dev/null || true
    fi
    echo "   👉 启动全新的前端 Express PM2 进程 (端口: ${FRONTEND_PORT})..."
    cd apps/frontend
    pm2 start server.js --name "smart-notepad-web" --update-env
    cd ../..
    pm2 save
    HOST_METHOD="Node.js (Express Proxy) 运行在 http://0.0.0.0:${FRONTEND_PORT}"

elif [ "$HOST_CHOICE" == "2" ]; then
    echo "⚙️ 选择 2: 使用 Nginx 托管..."
    if ! command -v nginx &> /dev/null; then
        echo "   👉 未找到 Nginx，正在尝试使用包管理器安装..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y epel-release && sudo yum install -y nginx
        elif command -v brew &> /dev/null; then
            brew install nginx
            brew services start nginx
        else
            echo "❌ 无法自动决定包管理器来安装 Nginx，请手动安装！"
            exit 1
        fi
        echo "   ✅ Nginx 安装完成。"
    fi

    # Optional auto-configuration of Nginx could go here. For safety, we just explain the path.
    HOST_METHOD="Nginx (请查阅 README 配置 server 区块指向静态资源)"
else
    echo "⚙️ 选择 3: 仅构建完毕，跳过托管启动。"
    HOST_METHOD="手动托管 (静态资源已就绪)"
fi

# 8. Configure PM2 auto-start on system boot
echo ""
echo "========================================="
echo "  🔄 配置 PM2 开机自启"
echo "========================================="

# Check if PM2 startup has already been configured
if [ ! -f "$HOME/Library/LaunchAgents/pm2.$(whoami).plist" ] 2>/dev/null; then
    echo "📋 正在生成 PM2 开机自启配置命令..."
    echo ""
    echo "======================================"
    pm2 startup || true
    echo "======================================"
    echo ""
    echo "⚠️  请执行上面显示的 sudo 命令以完成开机自启配置！"
    echo ""
    echo "配置完成后，系统重启后前后端服务将自动启动。"
else
    echo "✅ PM2 开机自启已经配置过，跳过。"
fi

# Final save to ensure all processes are registered
pm2 save

echo ""
echo "========================================="
echo "🎉 部署脚本执行彻底完成！"
echo ""
echo "  🚀 [后端 API 服务]:"
echo "      进程名称: smart-notepad-api"
echo "      监听地址: http://0.0.0.0:${PORT:-3000}"
echo ""
echo "  🎨 [前端 Web 服务]:"
echo "      部署方式: ${HOST_METHOD}"
echo "      访问目录: $(pwd)/apps/frontend/dist"
echo "      API 指向: ${VITE_API_PROXY_TARGET:-http://localhost:3000}"
echo ""
echo "  👉 可使用 \`pm2 status\` 查看常驻后台进程状态。"
echo "  👉 可使用 \`./deploy.sh stop\` 停止所有服务。"
echo "========================================="
