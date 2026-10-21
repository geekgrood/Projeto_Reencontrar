// src/utils/match.js — sistema de correspondência ("match")
// Ideia: um objeto PERDIDO e um ENCONTRADO são parecidos se tiverem a mesma categoria
// e partilharem palavras-chave (ex.: "casaco", "preto"). Damos pontos a cada coincidência.

const PALAVRAS_IGNORADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'um', 'uma', 'o', 'a', 'os', 'as',
  'e', 'em', 'no', 'na', 'para', 'por', 'que', 'tem', 'muito', 'meu', 'minha']);

// "Casaco PRETO, com capuz!" -> ["casaco", "preto", "capuz"]
function palavrasChave(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos: "ténis" -> "tenis"
    .split(/[^a-z0-9]+/)
    .filter(p => p.length > 2 && !PALAVRAS_IGNORADAS.has(p));
}

function pontuacao(a, b) {
  let pontos = 0;
  if (a.categoria_id === b.categoria_id) pontos += 3;
  if (a.local_id && a.local_id === b.local_id) pontos += 1;
  if (a.cor && b.cor && a.cor.toLowerCase() === b.cor.toLowerCase()) pontos += 2;
  if (a.tamanho && b.tamanho && a.tamanho === b.tamanho) pontos += 2;

  const pa = new Set(palavrasChave(`${a.titulo} ${a.descricao}`));
  const pb = new Set(palavrasChave(`${b.titulo} ${b.descricao}`));
  for (const p of pa) if (pb.has(p)) pontos += 2;

  // Diferença de datas: quanto mais próximas, mais provável
  const dias = Math.abs(new Date(a.data_ocorrencia) - new Date(b.data_ocorrencia)) / 86400000;
  if (dias <= 3) pontos += 1;
  return pontos;
}

// Devolve os candidatos mais parecidos (do tipo oposto), por ordem de pontuação
function encontrarCorrespondencias(item, candidatos, minimo = 5) {
  return candidatos
    .filter(c => c.id !== item.id && c.tipo !== item.tipo)
    .map(c => ({ ...c, pontuacao: pontuacao(item, c) }))
    .filter(c => c.pontuacao >= minimo)
    .sort((x, y) => y.pontuacao - x.pontuacao)
    .slice(0, 3);
}

module.exports = { encontrarCorrespondencias, palavrasChave };
