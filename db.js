/**
 * MySQL 数据库连接模块
 * 基于访问地址调用 MySQL 组件
 */

const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.MYSQL_HOST || 'mysqlac943c6f3b42.rds.ivolces.com',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'mysql_123',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'tapi_game',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
let pool = null;

/**
 * 获取数据库连接池
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    console.log('MySQL 连接池已创建');
    console.log(`连接地址: ${dbConfig.host}:${dbConfig.port}`);
  }
  return pool;
}

/**
 * 初始化数据库 - 创建数据库和表
 */
async function initDatabase() {
  // 先不指定数据库，用于创建数据库
  const initConfig = { ...dbConfig };
  delete initConfig.database;
  
  const connection = await mysql.createConnection(initConfig);
  
  try {
    // 创建数据库
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`数据库 ${dbConfig.database} 已创建/确认存在`);
    
    // 切换到目标数据库
    await connection.changeUser({ database: dbConfig.database });
    
    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        open_id VARCHAR(128) NOT NULL UNIQUE COMMENT '抖音用户OpenID',
        nickname VARCHAR(64) DEFAULT '' COMMENT '昵称',
        avatar_url VARCHAR(512) DEFAULT '' COMMENT '头像URL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_open_id (open_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表'
    `);
    console.log('用户表 users 已创建');
    
    // 创建游戏记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        map_type VARCHAR(32) NOT NULL COMMENT '地图类型',
        score INT DEFAULT 0 COMMENT '得分',
        waves_cleared INT DEFAULT 0 COMMENT '通过波数',
        play_time INT DEFAULT 0 COMMENT '游戏时长(秒)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user_id (user_id),
        INDEX idx_score (score DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏记录表'
    `);
    console.log('游戏记录表 game_records 已创建');
    
    // 创建排行榜表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE COMMENT '用户ID',
        best_score INT DEFAULT 0 COMMENT '最高分',
        total_games INT DEFAULT 0 COMMENT '总游戏次数',
        total_play_time INT DEFAULT 0 COMMENT '总游戏时长(秒)',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_best_score (best_score DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排行榜表'
    `);
    console.log('排行榜表 leaderboard 已创建');
    
    console.log('数据库初始化完成！');
    
  } finally {
    await connection.end();
  }
}

/**
 * 执行查询
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Array|Object>} SELECT返回rows数组，INSERT/UPDATE/DELETE返回ResultSetHeader
 */
async function query(sql, params = []) {
  const pool = getPool();
  const [result] = await pool.execute(sql, params);
  return result;
}

/**
 * 关闭连接池
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL 连接池已关闭');
  }
}

module.exports = {
  getPool,
  initDatabase,
  query,
  closePool
};
