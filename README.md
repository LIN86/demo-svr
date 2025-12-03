# 别碰我塔皮 - 后端服务

基于 Express + MySQL 的游戏后端服务，部署在抖音云。

## MySQL 连接信息

| 配置项 | 值 |
|--------|-----|
| 私网地址 | `mysqlac943c6f3b42.rds.ivolces.com:3306` |
| 公网地址 | `115.190.165.77:3306` |
| 用户名 | `mysql_123` |
| 数据库 | `tapi_game` |

## API 接口

### 健康检查
- `GET /health` - 服务健康检查

### 用户接口
- `POST /api/user/login` - 用户登录/注册
- `GET /api/user/:open_id` - 获取用户信息

### 游戏记录接口
- `POST /api/game/record` - 提交游戏记录
- `GET /api/game/records/:open_id` - 获取用户游戏记录

### 排行榜接口
- `GET /api/leaderboard` - 获取排行榜
- `GET /api/leaderboard/rank/:open_id` - 获取用户排名

## 本地开发

1. 安装依赖
```bash
npm install
```

2. 配置环境变量
编辑 `.env` 文件，填入正确的 MySQL 密码

3. 启动服务
```bash
npm start
```

## 部署到抖音云

1. 在抖音云控制台创建服务或更新现有服务
2. 选择 Docker 镜像部署方式
3. 上传代码或关联 Git 仓库
4. 配置环境变量（MySQL 密码等）
5. 发布服务

## 数据库表结构

### users 用户表
- id: 主键
- open_id: 抖音用户 OpenID
- nickname: 昵称
- avatar_url: 头像

### game_records 游戏记录表
- id: 主键
- user_id: 用户ID
- map_type: 地图类型
- score: 得分
- waves_cleared: 通过波数
- play_time: 游戏时长

### leaderboard 排行榜表
- id: 主键
- user_id: 用户ID
- best_score: 最高分
- total_games: 总游戏次数
- total_play_time: 总游戏时长
