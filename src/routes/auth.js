// src/routes/auth.js — registo e login
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();
const DOMINIO = '@valdorio.net'; // só a comunidade escolar pode criar conta

function criarToken(u) {
  return jwt.sign({ id: u.id, nome: u.nome, tipo: u.tipo }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/registo
router.post('/registo', async (req, res) => {
  try {
    const { nome, email, password, turma } = req.body;
    const emailLimpo = String(email || '').trim().toLowerCase();

    if (!nome || !emailLimpo || !password) return res.status(400).json({ erro: 'Preenche todos os campos.' });
    if (!emailLimpo.endsWith(DOMINIO)) return res.status(400).json({ erro: `Usa o teu email da escola (${DOMINIO}).` });
    if (password.length < 8) return res.status(400).json({ erro: 'A password precisa de pelo menos 8 caracteres.' });

    // bcrypt transforma a password num "hash" irreversível; o 10 é o custo (nº de rondas)
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO utilizadores (nome, email, password_hash, turma) VALUES (?, ?, ?, ?)',
      [nome.trim(), emailLimpo, hash, turma || null]
    );
    const utilizador = { id: r.insertId, nome: nome.trim(), tipo: 'aluno' };
    res.status(201).json({ token: criarToken(utilizador), utilizador });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já existe uma conta com este email.' });
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao criar a conta.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [linhas] = await pool.query(
      'SELECT id, nome, tipo, password_hash, ativo FROM utilizadores WHERE email = ?',
      [String(email || '').trim().toLowerCase()]
    );
    const u = linhas[0];
    // A mesma mensagem para "email não existe" e "password errada" — não damos pistas a atacantes
    if (!u || !u.ativo || !(await bcrypt.compare(password || '', u.password_hash))) {
      return res.status(401).json({ erro: 'Email ou password incorretos.' });
    }
    const utilizador = { id: u.id, nome: u.nome, tipo: u.tipo };
    res.json({ token: criarToken(utilizador), utilizador });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao iniciar sessão.' });
  }
});

module.exports = router;
