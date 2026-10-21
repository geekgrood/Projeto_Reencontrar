# Portal de Achados e Perdidos Digital — Val do Rio

PAP 2026 · TISO24 · Salvador Carvalho (n.º 5700) e Max Oliveira (n.º 5879)

## Como pôr a funcionar

1. **Base de dados** — no phpMyAdmin (XAMPP), separador *SQL*, colar o conteúdo de `schema.sql` e executar.
2. **Dependências** — na pasta do projeto: `npm install`
3. **Configuração** — copiar `.env.example` para `.env` e preencher (no XAMPP a password do root costuma estar vazia).
4. **Arrancar** — `npm run dev` e abrir http://localhost:3000

## Contas de teste (password: `teste123`)

| Email | Tipo |
|---|---|
| secretaria@valdorio.net | admin (vê o Painel da Secretaria) |
| salvador@valdorio.net | aluno |
| max@valdorio.net | aluno |

## Estrutura

```
achados-perdidos/
├── schema.sql              base de dados + dados de teste
├── src/
│   ├── server.js           arranque do Express e rotas gerais
│   ├── db.js               ligação ao MySQL (pool)
│   ├── middleware/auth.js  verificação do token JWT
│   ├── routes/auth.js      registo e login (bcrypt)
│   ├── routes/itens.js     publicar, listar, ver, upload de fotos
│   ├── routes/reclamacoes.js  "Isto é meu!", aprovação, código/QR, entrega
│   └── utils/match.js      algoritmo de correspondência perdido ↔ encontrado
├── public/                 frontend (HTML, CSS, JavaScript)
└── uploads/                fotos enviadas pelos utilizadores
```

## Rotas da API

| Método | Rota | Quem | Para quê |
|---|---|---|---|
| POST | /api/auth/registo | todos | criar conta (só @valdorio.net) |
| POST | /api/auth/login | todos | iniciar sessão |
| GET | /api/itens | todos | listar com pesquisa e filtros |
| GET | /api/itens/:id | todos | detalhe + correspondências |
| POST | /api/itens | com sessão | publicar (com foto) |
| DELETE | /api/itens/:id | autor / secretaria | arquivar |
| POST | /api/reclamacoes | com sessão | "Isto é meu!" |
| GET | /api/reclamacoes/minhas | com sessão | os meus pedidos (+ QR Code) |
| GET | /api/reclamacoes | secretaria | todos os pedidos |
| PATCH | /api/reclamacoes/:id | secretaria | aprovar / rejeitar |
| POST | /api/reclamacoes/entregar | secretaria | confirmar entrega com o código |
| GET | /api/categorias, /api/locais, /api/estatisticas | todos | listas e números |
