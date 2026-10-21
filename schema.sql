-- =========================================================
-- Portal de Achados e Perdidos Digital — Escola Profissional Val do Rio
-- PAP TISO24 — Salvador Carvalho (n.º 5700) & Max Oliveira (n.º 5879)
-- Base de dados: MySQL 8 / MariaDB (XAMPP)
-- =========================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS achados_perdidos;
CREATE DATABASE achados_perdidos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE achados_perdidos;

-- ---------------------------------------------------------
-- 1. UTILIZADORES — quem usa o portal
-- ---------------------------------------------------------
CREATE TABLE utilizadores (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome           VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL UNIQUE,        -- só são aceites emails @valdorio.net
  password_hash  VARCHAR(255)  NOT NULL,              -- password encriptada com bcrypt (nunca em texto simples)
  tipo           ENUM('aluno','professor','funcionario','admin') NOT NULL DEFAULT 'aluno',
  turma          VARCHAR(20)   NULL,                  -- só para alunos (ex.: TISO24)
  ativo          BOOLEAN       NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 2. CATEGORIAS — tipo de objeto
-- ---------------------------------------------------------
CREATE TABLE categorias (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(60) NOT NULL UNIQUE,
  icone     VARCHAR(30) NULL,                          -- nome do ícone (biblioteca Lucide)
  tem_tamanho BOOLEAN NOT NULL DEFAULT FALSE           -- TRUE para Roupa e Calçado
);

-- ---------------------------------------------------------
-- 3. LOCAIS — espaços da escola
-- ---------------------------------------------------------
CREATE TABLE locais (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome    VARCHAR(80) NOT NULL UNIQUE
);

-- ---------------------------------------------------------
-- 4. ITENS — objetos perdidos ou encontrados
-- ---------------------------------------------------------
CREATE TABLE itens (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo          VARCHAR(120) NOT NULL,
  descricao       TEXT         NULL,
  tamanho         VARCHAR(10)  NULL,                   -- XS..XXL, 34..48, 35..46, Único, Não sei
  cor             VARCHAR(30)  NULL,
  tipo            ENUM('perdido','encontrado') NOT NULL,
  estado          ENUM('ativo','reclamado','devolvido','arquivado') NOT NULL DEFAULT 'ativo',
  data_ocorrencia DATE         NOT NULL,
  imagem_url      VARCHAR(255) NULL,
  categoria_id    INT UNSIGNED NOT NULL,
  local_id        INT UNSIGNED NULL,
  utilizador_id   INT UNSIGNED NOT NULL,               -- quem publicou
  criado_em       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_itens_categoria  FOREIGN KEY (categoria_id)  REFERENCES categorias(id),
  CONSTRAINT fk_itens_local      FOREIGN KEY (local_id)      REFERENCES locais(id) ON DELETE SET NULL,
  CONSTRAINT fk_itens_utilizador FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id),

  INDEX idx_itens_tipo_estado (tipo, estado),
  INDEX idx_itens_data (data_ocorrencia)
);

-- ---------------------------------------------------------
-- 5. RECLAMACOES — pedidos "Isto é meu!"
-- ---------------------------------------------------------
CREATE TABLE reclamacoes (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id            INT UNSIGNED NOT NULL,
  utilizador_id      INT UNSIGNED NOT NULL,            -- quem diz que o objeto é seu
  mensagem           TEXT         NOT NULL,            -- prova (ex.: "tem um autocolante azul")
  estado             ENUM('pendente','aprovada','rejeitada','entregue') NOT NULL DEFAULT 'pendente',
  codigo_devolucao   CHAR(6)      NULL UNIQUE,         -- código mostrado na secretaria (e em QR Code)
  decidido_por       INT UNSIGNED NULL,
  criado_em          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decidido_em        TIMESTAMP    NULL,

  CONSTRAINT fk_recl_item        FOREIGN KEY (item_id)       REFERENCES itens(id) ON DELETE CASCADE,
  CONSTRAINT fk_recl_utilizador  FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id),
  CONSTRAINT fk_recl_decisor     FOREIGN KEY (decidido_por)  REFERENCES utilizadores(id),
  UNIQUE KEY uq_recl_item_user (item_id, utilizador_id)
);

-- ---------------------------------------------------------
-- DADOS DE TESTE
-- ---------------------------------------------------------
INSERT INTO categorias (nome, icone, tem_tamanho) VALUES
  ('Eletrónica','smartphone',FALSE), ('Roupa','shirt',TRUE), ('Calçado','footprints',TRUE),
  ('Material escolar','pencil-ruler',FALSE), ('Chaves','key-round',FALSE),
  ('Cartão de aluno','id-card',FALSE), ('Documentos','file-text',FALSE),
  ('Garrafas e lancheiras','cup-soda',FALSE), ('Acessórios','glasses',FALSE), ('Outros','package',FALSE);

INSERT INTO locais (nome) VALUES
  ('Bar'), ('Portaria'), ('Campo de jogos'), ('Biblioteca / Centro de Recursos'),
  ('Sala de informática'), ('Estúdio de vídeo'), ('Laboratório de eletrónica'),
  ('Secretaria'), ('Corredor / Escadas'), ('Exterior da escola');

-- Password de todas as contas de teste: teste123
INSERT INTO utilizadores (nome, email, password_hash, tipo, turma) VALUES
  ('Secretaria Val do Rio', 'secretaria@valdorio.net', '$2b$10$MtEZnxkFPFHAtLEvtTjwiusGcVzQ4g594vrU94AFweniLZ5cPI54y', 'admin', NULL),
  ('Salvador Carvalho',     'salvador@valdorio.net',   '$2b$10$MtEZnxkFPFHAtLEvtTjwiusGcVzQ4g594vrU94AFweniLZ5cPI54y', 'aluno', 'TISO24'),
  ('Max Oliveira',          'max@valdorio.net',        '$2b$10$MtEZnxkFPFHAtLEvtTjwiusGcVzQ4g594vrU94AFweniLZ5cPI54y', 'aluno', 'TISO24');

INSERT INTO itens (titulo, descricao, tamanho, cor, tipo, data_ocorrencia, categoria_id, local_id, utilizador_id, estado) VALUES
  ('Casaco preto com capuz', 'Deixado numa cadeira depois da aula de educação física.', 'M', 'Preto', 'encontrado', '2026-10-13', 2, 3, 1, 'ativo'),
  ('Calculadora Casio fx-991', 'Tem o nome riscado na parte de trás.', NULL, 'Cinzento', 'perdido', '2026-10-12', 4, 5, 2, 'ativo'),
  ('Porta-chaves com 3 chaves', 'Porta-chaves azul com uma chave de cadeado.', NULL, 'Azul', 'encontrado', '2026-10-12', 5, 1, 1, 'ativo'),
  ('Auriculares sem fios', 'Caixa branca, perdidos durante o intervalo grande.', NULL, 'Branco', 'perdido', '2026-10-11', 1, 1, 3, 'ativo'),
  ('Cartão de aluno', 'Encontrado junto ao leitor de cartões da entrada.', NULL, NULL, 'encontrado', '2026-10-11', 6, 2, 1, 'ativo'),
  ('Ténis brancos', 'Par de ténis deixado no balneário.', '42', 'Branco', 'encontrado', '2026-10-10', 3, 3, 1, 'ativo'),
  ('Garrafa térmica verde', 'Tem autocolantes de bandas.', NULL, 'Verde', 'perdido', '2026-10-09', 8, 4, 2, 'ativo'),
  ('Pen USB 64 GB', 'Tem trabalhos da PAP — muito importante!', NULL, 'Vermelho', 'perdido', '2026-10-08', 1, 5, 3, 'ativo'),
  ('Sweat cinzenta Val do Rio', 'Encontrada no estúdio de vídeo.', 'L', 'Cinzento', 'encontrado', '2026-10-07', 2, 6, 1, 'devolvido'),
  ('Óculos de sol', 'Estojo castanho.', NULL, 'Castanho', 'encontrado', '2026-10-06', 9, 10, 1, 'ativo'),
  ('Casaco preto', 'Perdi o meu casaco com capuz no campo de jogos.', 'M', 'Preto', 'perdido', '2026-10-13', 2, 3, 3, 'ativo'),
  ('Garrafa verde com autocolantes', 'Estava em cima de uma mesa da biblioteca.', NULL, 'Verde', 'encontrado', '2026-10-10', 8, 4, 1, 'ativo');

INSERT INTO reclamacoes (item_id, utilizador_id, mensagem, estado) VALUES
  (1, 3, 'É o meu casaco, tem uma etiqueta com as iniciais M.O. por dentro.', 'pendente'),
  (3, 2, 'São as chaves do meu cacifo, o porta-chaves é azul com um mosquetão.', 'pendente');
