// src/routes/reclamacoes.js — "Isto é meu!" e validação pela secretaria
const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db');
const { autenticar, soStaff } = require('../middleware/auth');

const router = express.Router();

// Código de 6 caracteres sem letras confusas (sem O/0, I/1)
function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(6), b => letras[b % letras.length]).join('');
}

// POST /api/reclamacoes — o aluno diz que um objeto é seu
router.post('/', autenticar, async (req, res) => {
  try {
    const { item_id, mensagem } = req.body;
    if (!item_id || !mensagem || mensagem.trim().length < 10) {
      return res.status(400).json({ erro: 'Descreve o objeto com pelo menos 10 caracteres para provar que é teu.' });
    }
    await pool.query('INSERT INTO reclamacoes (item_id, utilizador_id, mensagem) VALUES (?, ?, ?)',
      [item_id, req.utilizador.id, mensagem.trim()]);
    await pool.query("UPDATE itens SET estado = 'reclamado' WHERE id = ? AND estado = 'ativo'", [item_id]);
    res.status(201).json({ ok: true });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já fizeste um pedido para este objeto.' });
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao enviar o pedido.' });
  }
});

// GET /api/reclamacoes/minhas — pedidos do utilizador (com QR Code se aprovado)
router.get('/minhas', autenticar, async (req, res) => {
  try {
    const [linhas] = await pool.query(
      `SELECT r.id, r.estado, r.codigo_devolucao, r.criado_em, i.titulo, i.id AS item_id
       FROM reclamacoes r JOIN itens i ON i.id = r.item_id
       WHERE r.utilizador_id = ? ORDER BY r.criado_em DESC`, [req.utilizador.id]);
    for (const r of linhas) {
      if (r.estado === 'aprovada') r.qr = await QRCode.toDataURL(`VALDORIO-AP:${r.codigo_devolucao}`, { margin: 1, width: 220 });
    }
    res.json(linhas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao obter os pedidos.' });
  }
});

// ----------------- Área da secretaria -----------------

// GET /api/reclamacoes — todos os pedidos (só staff)
router.get('/', autenticar, soStaff, async (req, res) => {
  try {
    const [linhas] = await pool.query(
      `SELECT r.id, r.mensagem, r.estado, r.codigo_devolucao, r.criado_em,
              i.id AS item_id, i.titulo, i.tipo, c.icone,
              u.nome AS aluno, u.turma
       FROM reclamacoes r
       JOIN itens i ON i.id = r.item_id
       JOIN categorias c ON c.id = i.categoria_id
       JOIN utilizadores u ON u.id = r.utilizador_id
       ORDER BY FIELD(r.estado,'pendente','aprovada','entregue','rejeitada'), r.criado_em DESC`);
    res.json(linhas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao obter os pedidos.' });
  }
});

// PATCH /api/reclamacoes/:id — aprovar ou rejeitar
router.patch('/:id', autenticar, soStaff, async (req, res) => {
  try {
    const { decisao } = req.body; // 'aprovada' | 'rejeitada'
    if (!['aprovada', 'rejeitada'].includes(decisao)) return res.status(400).json({ erro: 'Decisão inválida.' });
    const codigo = decisao === 'aprovada' ? gerarCodigo() : null;

    await pool.query(
      `UPDATE reclamacoes SET estado = ?, codigo_devolucao = ?, decidido_por = ?, decidido_em = NOW()
       WHERE id = ? AND estado = 'pendente'`, [decisao, codigo, req.utilizador.id, req.params.id]);
    res.json({ ok: true, codigo });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao decidir o pedido.' });
  }
});

// POST /api/reclamacoes/entregar — a secretaria lê o código/QR e confirma a entrega
router.post('/entregar', autenticar, soStaff, async (req, res) => {
  const ligacao = await pool.getConnection();
  try {
    const codigo = String(req.body.codigo || '').replace('VALDORIO-AP:', '').trim().toUpperCase();
    const [linhas] = await ligacao.query(
      "SELECT id, item_id FROM reclamacoes WHERE codigo_devolucao = ? AND estado = 'aprovada'", [codigo]);
    if (!linhas[0]) return res.status(404).json({ erro: 'Código inválido ou já utilizado.' });

    // Transação: as duas alterações acontecem juntas ou nenhuma acontece
    await ligacao.beginTransaction();
    await ligacao.query("UPDATE reclamacoes SET estado = 'entregue' WHERE id = ?", [linhas[0].id]);
    await ligacao.query("UPDATE itens SET estado = 'devolvido' WHERE id = ?", [linhas[0].item_id]);
    await ligacao.commit();
    res.json({ ok: true });
  } catch (erro) {
    await ligacao.rollback();
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao confirmar a entrega.' });
  } finally {
    ligacao.release();
  }
});

module.exports = router;
