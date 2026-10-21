// src/routes/itens.js — publicar, listar e ver objetos (CRUD de itens)
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { pool } = require('../db');
const { autenticar } = require('../middleware/auth');
const { encontrarCorrespondencias } = require('../utils/match');

const router = express.Router();

// ---------- Upload de imagens (multer) ----------
// Guarda as fotos na pasta /uploads com um nome aleatório (evita nomes repetidos ou maliciosos)
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, ficheiro, cb) => cb(null, crypto.randomUUID() + path.extname(ficheiro.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // máx. 5 MB
  fileFilter: (req, ficheiro, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(ficheiro.mimetype))
});

const SELECT_BASE = `
  SELECT i.id, i.titulo, i.descricao, i.tamanho, i.cor, i.tipo, i.estado, i.data_ocorrencia,
         i.imagem_url, i.categoria_id, i.local_id, i.criado_em,
         c.nome AS categoria, c.icone, l.nome AS local, u.nome AS publicado_por
  FROM itens i
  JOIN categorias c ON c.id = i.categoria_id
  LEFT JOIN locais l ON l.id = i.local_id
  JOIN utilizadores u ON u.id = i.utilizador_id`;

// GET /api/itens?q=casaco&tipo=encontrado&categoria=2&local=3
router.get('/', async (req, res) => {
  try {
    const { q, tipo, categoria, local, tamanho } = req.query;
    let sql = SELECT_BASE + " WHERE i.estado IN ('ativo','reclamado')";
    const params = [];

    if (q)         { sql += ' AND (i.titulo LIKE ? OR i.descricao LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (tipo)      { sql += ' AND i.tipo = ?';         params.push(tipo); }
    if (categoria) { sql += ' AND i.categoria_id = ?'; params.push(categoria); }
    if (local)     { sql += ' AND i.local_id = ?';     params.push(local); }
    if (tamanho)   { sql += ' AND i.tamanho = ?';      params.push(tamanho); }
    sql += ' ORDER BY i.data_ocorrencia DESC, i.id DESC';

    // Os "?" são preenchidos pelo mysql2 de forma segura -> protege contra SQL Injection
    const [linhas] = await pool.query(sql, params);
    res.json(linhas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao obter os itens.' });
  }
});

// GET /api/itens/:id — detalhe + sugestões de correspondência
router.get('/:id', async (req, res) => {
  try {
    const [linhas] = await pool.query(SELECT_BASE + ' WHERE i.id = ?', [req.params.id]);
    const item = linhas[0];
    if (!item) return res.status(404).json({ erro: 'Item não encontrado.' });

    const [candidatos] = await pool.query(SELECT_BASE + " WHERE i.estado = 'ativo' AND i.tipo <> ?", [item.tipo]);
    item.correspondencias = encontrarCorrespondencias(item, candidatos);
    res.json(item);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao obter o item.' });
  }
});

// POST /api/itens — publicar (precisa de sessão iniciada)
router.post('/', autenticar, upload.single('imagem'), async (req, res) => {
  try {
    const { titulo, descricao, tamanho, cor, tipo, data_ocorrencia, categoria_id, local_id } = req.body;
    if (!titulo || !tipo || !data_ocorrencia || !categoria_id) {
      return res.status(400).json({ erro: 'Preenche o título, o tipo, a data e a categoria.' });
    }
    if (!['perdido', 'encontrado'].includes(tipo)) return res.status(400).json({ erro: 'Tipo inválido.' });

    const imagem_url = req.file ? '/uploads/' + req.file.filename : null;
    const [r] = await pool.query(
      `INSERT INTO itens (titulo, descricao, tamanho, cor, tipo, data_ocorrencia, imagem_url, categoria_id, local_id, utilizador_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [titulo.trim(), descricao || null, tamanho || null, cor || null, tipo, data_ocorrencia,
       imagem_url, categoria_id, local_id || null, req.utilizador.id]
    );
    res.status(201).json({ id: r.insertId });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao publicar o item.' });
  }
});

// DELETE /api/itens/:id — só quem publicou (ou a secretaria) pode arquivar
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const staff = ['admin', 'funcionario'].includes(req.utilizador.tipo);
    const [r] = await pool.query(
      `UPDATE itens SET estado = 'arquivado' WHERE id = ? ${staff ? '' : 'AND utilizador_id = ?'}`,
      staff ? [req.params.id] : [req.params.id, req.utilizador.id]
    );
    if (!r.affectedRows) return res.status(403).json({ erro: 'Não podes remover este item.' });
    res.json({ ok: true });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao remover o item.' });
  }
});

module.exports = router;
