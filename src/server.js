// src/server.js — ponto de entrada da aplicação
require('dotenv').config();
const express = require('express');
const path = require('path');
const { pool, testarLigacao } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const raiz = path.join(__dirname, '..');

app.use(express.json());
app.use(express.static(path.join(raiz, 'public')));                // frontend (HTML/CSS/JS)
app.use('/uploads', express.static(path.join(raiz, 'uploads')));    // fotos dos objetos
app.use('/vendor/lucide', express.static(path.join(raiz, 'node_modules/lucide/dist/umd')));           // ícones
app.use('/vendor/fonte', express.static(path.join(raiz, 'node_modules/@fontsource/plus-jakarta-sans'))); // tipo de letra

// ---------- Rotas da API ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/itens', require('./routes/itens'));
app.use('/api/reclamacoes', require('./routes/reclamacoes'));

// Listas simples para preencher os filtros e formulários
app.get('/api/categorias', async (req, res) => {
  const [linhas] = await pool.query('SELECT id, nome, icone, tem_tamanho FROM categorias ORDER BY nome');
  res.json(linhas);
});
app.get('/api/locais', async (req, res) => {
  const [linhas] = await pool.query('SELECT id, nome FROM locais ORDER BY nome');
  res.json(linhas);
});

// Números para a página inicial e para o painel da secretaria
app.get('/api/estatisticas', async (req, res) => {
  const [[totais]] = await pool.query(`
    SELECT SUM(estado IN ('ativo','reclamado') AND tipo = 'perdido')    AS perdidos,
           SUM(estado IN ('ativo','reclamado') AND tipo = 'encontrado') AS encontrados,
           SUM(estado = 'devolvido')                                     AS devolvidos
    FROM itens`);
  const [[{ pendentes }]] = await pool.query("SELECT COUNT(*) AS pendentes FROM reclamacoes WHERE estado = 'pendente'");
  const [porLocal] = await pool.query(`
    SELECT l.nome, COUNT(*) AS total FROM itens i JOIN locais l ON l.id = i.local_id
    GROUP BY l.id ORDER BY total DESC LIMIT 5`);
  res.json({ ...totais, pendentes, porLocal });
});

testarLigacao().then(() => {
  app.listen(PORT, () => console.log(`🚀 Servidor a correr em http://localhost:${PORT}`));
});
