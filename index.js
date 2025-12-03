/**
 * 别碰我塔皮 - 后端服务
 * 基于 Express + MySQL 的游戏后端
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ========== 用户相关接口 ==========

/**
 * 用户登录/注册
 * POST /api/user/login
 */
app.post('/api/user/login', async (req, res) => {
  try {
    const { open_id, nickname, avatar_url } = req.body;
    
    if (!open_id) {
      return res.status(400).json({ code: -1, message: 'open_id 不能为空' });
    }
    
    // 查找或创建用户
    let users = await db.query('SELECT * FROM users WHERE open_id = ?', [open_id]);
    
    if (users.length === 0) {
      // 创建新用户
      const result = await db.query(
        'INSERT INTO users (open_id, nickname, avatar_url) VALUES (?, ?, ?)',
        [open_id, nickname || '', avatar_url || '']
      );
      users = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      
      // 初始化排行榜记录
      await db.query(
        'INSERT INTO leaderboard (user_id, best_score, total_games, total_play_time) VALUES (?, 0, 0, 0)',
        [result.insertId]
      );
    } else {
      // 更新用户信息
      if (nickname || avatar_url) {
        await db.query(
          'UPDATE users SET nickname = COALESCE(?, nickname), avatar_url = COALESCE(?, avatar_url) WHERE open_id = ?',
          [nickname, avatar_url, open_id]
        );
      }
    }
    
    res.json({ code: 0, data: users[0], message: '登录成功' });
  } catch (error) {
    console.error('用户登录失败:', error);
    res.status(500).json({ code: -1, message: '服务器错误' });
  }
});

/**
 * 获取用户信息
 * GET /api/user/:open_id
 */
app.get('/api/user/:open_id', async (req, res) => {
  try {
    const { open_id } = req.params;
    const users = await db.query('SELECT * FROM users WHERE open_id = ?', [open_id]);
    
    if (users.length === 0) {
      return res.status(404).json({ code: -1, message: '用户不存在' });
    }
    
    res.json({ code: 0, data: users[0] });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ code: -1, message: '服务器错误' });
  }
});

// ========== 游戏记录接口 ==========

/**
 * 提交游戏记录
 * POST /api/game/record
 */
app.post('/api/game/record', async (req, res) => {
  try {
    const { open_id, map_type, score, waves_cleared, play_time } = req.body;
    
    if (!open_id || !map_type) {
      return res.status(400).json({ code: -1, message: '参数不完整' });
    }
    
    // 获取用户ID
    const users = await db.query('SELECT id FROM users WHERE open_id = ?', [open_id]);
    if (users.length === 0) {
      return res.status(404).json({ code: -1, message: '用户不存在' });
    }
    const userId = users[0].id;
    
    // 插入游戏记录
    await db.query(
      'INSERT INTO game_records (user_id, map_type, score, waves_cleared, play_time) VALUES (?, ?, ?, ?, ?)',
      [userId, map_type, score || 0, waves_cleared || 0, play_time || 0]
    );
    
    // 更新排行榜
    await db.query(`
      INSERT INTO leaderboard (user_id, best_score, total_games, total_play_time)
      VALUES (?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE
        best_score = GREATEST(best_score, VALUES(best_score)),
        total_games = total_games + 1,
        total_play_time = total_play_time + VALUES(total_play_time)
    `, [userId, score || 0, play_time || 0]);
    
    res.json({ code: 0, message: '记录提交成功' });
  } catch (error) {
    console.error('提交游戏记录失败:', error);
    res.status(500).json({ code: -1, message: '服务器错误' });
  }
});

/**
 * 获取用户游戏记录
 * GET /api/game/records/:open_id
 */
app.get('/api/game/records/:open_id', async (req, res) => {
  try {
    const { open_id } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const records = await db.query(`
      SELECT gr.*, u.nickname, u.avatar_url
      FROM game_records gr
      JOIN users u ON gr.user_id = u.id
      WHERE u.open_id = ?
      ORDER BY gr.created_at DESC
      LIMIT ?
    `, [open_id, limit]);
    
    res.json({ code: 0, data: records });
  } catch (error) {
    console.error('获取游戏记录失败:', error);
    res.status(500).json({ code: -1, message: '服务器错误' });
  }
});

// ========== 排行榜接口 ==========

/**
 * 获取排行榜
 * GET /api/leaderboard
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const leaderboard = await db.query(`
      SELECT 
        l.best_score,
        l.total_games,
        l.total_play_time,
        u.nickname,
        u.avatar_url,
        u.open_id
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.best_score DESC
      LIMIT ?
    `, [limit]);
    
    // 添加排名
    const rankedList = leaderboard.map((item, index) => ({
      rank: index + 1,
      ...item
    }));
    
    res.json({ code: 0, data: rankedList });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ code: -1, message: '服务器错误' });
  }
});

/**
 * 获取用户排名
 * GET /api/leaderboard/rank/:open_id
 */
app.get('/api/leaderboard/rank/:open_id', async (req, res) => {
  try {
    const { open_id } = req.params;
    
    // 获取用户信息和排名
    const result = await db.query(`
      SELECT 
        u.open_id,
        u.nickname,
        u.avatar_url,
        l.best_score,
        l.total_games,
        l.total_play_time,
        (SELECT COUNT(*) + 1 FROM leaderboard l2 WHERE l2.best_score > l.best_score) as rank
      FROM users u
      LEFT JOIN leaderboard l ON u.id = l.user_id
      WHERE u.open_id = ?
    `, [open_id]);
    
    if (result.length === 0) {
      return res.status(404).json({ code: -1, message: '用户不存在' });
    }
    
    res.json({ code: 0, data: result[0] });
  } catch (error) {
    console.error('获取用户排名失败:', error);
    res.status(500).json({ code: -1, message: '服务器错误' });
  }
});

// ========== 启动服务 ==========

async function startServer() {
  try {
    // 初始化数据库
    console.log('正在初始化数据库...');
    await db.initDatabase();
    
    // 启动服务
    app.listen(PORT, () => {
      console.log(`服务已启动: http://localhost:${PORT}`);
      console.log('API 接口:');
      console.log('  GET  /health                    - 健康检查');
      console.log('  POST /api/user/login            - 用户登录/注册');
      console.log('  GET  /api/user/:open_id         - 获取用户信息');
      console.log('  POST /api/game/record           - 提交游戏记录');
      console.log('  GET  /api/game/records/:open_id - 获取游戏记录');
      console.log('  GET  /api/leaderboard           - 获取排行榜');
      console.log('  GET  /api/leaderboard/rank/:id  - 获取用户排名');
    });
  } catch (error) {
    console.error('服务启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，正在关闭服务...');
  await db.closePool();
  process.exit(0);
});

startServer();
