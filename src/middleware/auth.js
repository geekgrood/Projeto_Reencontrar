// src/middleware/auth.js — proteção das rotas
// O utilizador recebe um "token" (JWT) quando faz login. Em cada pedido envia-o no cabeçalho
// Authorization: Bearer <token>. Aqui verificamos se o token é válido e quem é o utilizador.
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Tens de iniciar sessão.' });

  try {
    req.utilizador = jwt.verify(token, process.env.JWT_SECRET); // { id, nome, tipo }
    next();
  } catch {
    res.status(401).json({ erro: 'Sessão inválida ou expirada. Inicia sessão outra vez.' });
  }
}

// Só deixa passar funcionários e administradores (ex.: secretaria)
function soStaff(req, res, next) {
  if (['admin', 'funcionario'].includes(req.utilizador.tipo)) return next();
  res.status(403).json({ erro: 'Sem permissão para esta ação.' });
}

module.exports = { autenticar, soStaff };
