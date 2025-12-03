# 抖音云 Docker 部署配置
FROM node:18-alpine

# 抖音云要求工作目录为 /opt/application
WORKDIR /opt/application

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY . .

# 设置启动脚本权限
RUN chmod +x run.sh

# 暴露端口（抖音云默认使用8000端口）
EXPOSE 8000

# 启动服务
CMD ["sh", "run.sh"]
