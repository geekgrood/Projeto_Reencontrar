// src/db.js — ligação à base de dados MySQL
// Usamos um "pool" de ligações: reaproveita ligações em vez de abrir uma nova a cada pedido.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true // devolve datas como texto "2026-10-13" em vez de objetos Date
});

// Testa a ligação ao arrancar — se falhar, vemos logo o erro no terminal
async function testarLigacao() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Ligação à base de dados estabelecida');
    conn.release();
  } catch (erro) {
    console.error('❌ Erro ao ligar à base de dados:', erro.message);
    process.exit(1);
  }
}

module.exports = { pool, testarLigacao };
