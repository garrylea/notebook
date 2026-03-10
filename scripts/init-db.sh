#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================="
echo "  🐘 PostgreSQL Database Initialization "
echo "========================================="

# 1. Load environment variables
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 配置文件，正在自动从 .env.example 复制..."
    cp .env.example .env
    echo "❌ 警告: 请使用 vim .env 修改关键配置信息(数据库连接与密码)，修改后再重新运行此部署脚本!"
    exit 1
fi

set -a
source .env
set +a

# Extract DB credentials from POSTGRES_ vars or fallback to parsing DATABASE_URL
DB_USER=${POSTGRES_USER:-"notepad"}
DB_PASS=${POSTGRES_PASSWORD:-"CHANGE_THIS_STRONG_PASSWORD"}
DB_NAME=${POSTGRES_DB:-"smart_notepad"}

# 2. Check if PostgreSQL client is installed
if ! command -v psql &> /dev/null; then
    echo "⚙️  未检测到 psql 客户端，正在尝试安装 PostgreSQL..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
    elif command -v yum &> /dev/null; then
        sudo yum install -y postgresql-server postgresql-contrib
        sudo postgresql-setup initdb || true
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif command -v brew &> /dev/null; then
        brew install postgresql
        brew services start postgresql
    else
        echo "❌ 无法自动决定包管理器来安装 PostgreSQL，请手动安装后重试。"
        exit 1
    fi
    echo "✅ PostgreSQL 安装完成。"
else
    echo "✅ psql 客户端已安装。"
fi

# Ensure PostgreSQL service is running (Linux)
if command -v systemctl &> /dev/null && systemctl list-unit-files | grep -q postgresql; then
    sudo systemctl start postgresql
fi

# 3. Create User and Database (Requires postgres superuser access)
echo "🔒 正在尝试配置数据库用户与数据库 (需要超级权限)..."

# Construct SQL commands
SQL_USER="DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}'; ELSE ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}'; END IF; END \$\$;"
SQL_DB="SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec"

# A. Try using the current user (typical for macOS Brew installations)
if psql postgres -c "$SQL_USER" -c "$SQL_DB" 2>/dev/null || psql template1 -c "$SQL_USER" -c "$SQL_DB" 2>/dev/null; then
    echo "✅ 成功使用当前环境用户配置数据库角色。"
# B. Try using 'postgres' OS user (typical for Linux apt/yum installations)
elif sudo -u postgres psql -c "$SQL_USER" -c "$SQL_DB" 2>/dev/null; then
    echo "✅ 成功通过 'postgres' 系统用户配置数据库角色。"
else
    echo "⚠️  自动创建角色或数据库失败。若数据库和用户已存在，或配置在远端，将直接进入连通性测试..."
fi

# 4. Test connection
echo "🔌 测试数据库连接..."

# Attempt to connect to the database with the provided credentials
export PGPASSWORD="${DB_PASS}"

# Try via localhost (TCP mapping, standard for production or explicit host mapping)
if psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c '\q' 2>/dev/null; then
    echo "✅ 数据库连接成功！(通过 TCP localhost 连接)"
# Fallback to local socket mapping (common for macOS direct user connections without passwords)
elif psql -U "${DB_USER}" -d "${DB_NAME}" -c '\q' 2>/dev/null; then
    echo "✅ 数据库连接成功！(通过本地 Unix Socket 自动验证连接)"
else
    echo "❌ 数据库连接失败。请检查 PostgreSQL 服务是否允许密码登录 (pg_hba.conf)，或检查端口和密码是否正确。"
    echo "   如果您使用的是非本机数据库，请手动在 .env 中设置好 DATABASE_URL 以正确启动后端。"
    exit 1
fi

echo "========================================="
echo "🎉 数据库初始化与环境检测完成！"
echo "========================================="
