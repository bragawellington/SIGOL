-- ============================================
-- SIGOL — Migração Supabase
-- Execute no SQL Editor do Supabase
-- ============================================

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabela: usuarios ──
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('OPERADOR', 'TÉCNICO', 'FATURAMENTO', 'GERÊNCIA')),
  ativo BOOLEAN DEFAULT true,
  senha_hash TEXT NOT NULL DEFAULT crypt('sigol123', gen_salt('bf')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Tabela: colaboradores ──
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registro TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  equipe TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true
);

-- ── Tabela: equipamentos ──
CREATE TABLE IF NOT EXISTS equipamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  frota TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL,
  chave TEXT NOT NULL,
  ni TEXT NOT NULL,
  valor_hora NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true
);

-- ── Tabela: cadastro_florestal ──
CREATE TABLE IF NOT EXISTS cadastro_florestal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  up TEXT NOT NULL,
  fazenda TEXT NOT NULL,
  area NUMERIC(10,2) NOT NULL,
  nucleo TEXT NOT NULL
);

-- ── Tabela: lancamentos ──
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data DATE NOT NULL,
  frota TEXT NOT NULL,
  equipamento TEXT,
  up TEXT NOT NULL,
  fazenda TEXT,
  nucleo TEXT,
  area_up NUMERIC(10,2),
  horimetro_inicial NUMERIC(12,2) NOT NULL,
  horimetro_final NUMERIC(12,2) NOT NULL,
  horas_trabalhadas NUMERIC(8,2) GENERATED ALWAYS AS (horimetro_final - horimetro_inicial) STORED,
  horas_sap NUMERIC(8,2) NOT NULL DEFAULT 0,
  atividade TEXT NOT NULL,
  operador_codigo TEXT NOT NULL,
  operador_nome TEXT NOT NULL,
  rendimento NUMERIC(8,4),
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'DEVOLVIDO', 'FATURADO')),
  observacao TEXT,
  criado_por TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  aprovado_por TEXT,
  aprovado_em TIMESTAMPTZ,
  faturado_por TEXT,
  faturado_em TIMESTAMPTZ,
  valor_hora_faturamento NUMERIC(10,2),
  valor_total_faturamento NUMERIC(12,2),
  anexo TEXT,
  anexo_nome TEXT
);

-- ── Tabela: auditoria ──
CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario TEXT NOT NULL,
  acao TEXT NOT NULL,
  registro TEXT,
  descricao TEXT,
  data_hora TIMESTAMPTZ DEFAULT now()
);

-- ── Tabela: atividades ──
CREATE TABLE IF NOT EXISTS atividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true
);

-- ── Índices ──
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_frota ON lancamentos(frota);
CREATE INDEX IF NOT EXISTS idx_lancamentos_up ON lancamentos(up);
CREATE INDEX IF NOT EXISTS idx_cadastro_florestal_up ON cadastro_florestal(up);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(data_hora);

-- ── RPC: buscar_up (autocomplete) ──
CREATE OR REPLACE FUNCTION buscar_up(termo TEXT)
RETURNS SETOF cadastro_florestal
LANGUAGE sql STABLE
AS $$
  SELECT * FROM cadastro_florestal
  WHERE up ILIKE '%' || termo || '%'
     OR fazenda ILIKE '%' || termo || '%'
     OR nucleo ILIKE '%' || termo || '%'
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION buscar_up(TEXT) TO anon, authenticated;

-- ── RPC: login_usuario (autenticação por código único + senha) ──
CREATE OR REPLACE FUNCTION login_usuario(p_codigo TEXT, p_senha TEXT)
RETURNS SETOF usuarios
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT * FROM usuarios
  WHERE codigo = UPPER(p_codigo)
    AND senha_hash = crypt(p_senha, senha_hash)
    AND ativo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION login_usuario(TEXT, TEXT) TO anon, authenticated;

-- ── RPC: alterar_senha (troca de senha do usuário) ──
CREATE OR REPLACE FUNCTION alterar_senha(p_codigo TEXT, p_nova_senha TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios
  SET senha_hash = crypt(p_nova_senha, gen_salt('bf')),
      senha_alterada = true
  WHERE codigo = UPPER(p_codigo);
END;
$$;

GRANT EXECUTE ON FUNCTION alterar_senha(TEXT, TEXT) TO anon, authenticated;

-- ── RLS (Row Level Security) ──
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadastro_florestal ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para início (ajuste conforme necessidade de produção)
CREATE POLICY "Permitir leitura pública" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON colaboradores FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON equipamentos FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON cadastro_florestal FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON lancamentos FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública" ON auditoria FOR SELECT USING (true);

CREATE POLICY "Permitir insert autenticado" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir insert autenticado" ON colaboradores FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir insert autenticado" ON equipamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir insert autenticado" ON cadastro_florestal FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir insert autenticado" ON lancamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir insert autenticado" ON auditoria FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir update autenticado" ON lancamentos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete autenticado" ON auditoria FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública" ON atividades FOR SELECT USING (true);
CREATE POLICY "Permitir insert autenticado" ON atividades FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update autenticado" ON atividades FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete autenticado" ON atividades FOR DELETE USING (true);

-- ── Dados iniciais de teste (opcional) ──
INSERT INTO usuarios (nome, email, codigo, perfil, senha_hash) VALUES
  ('João Silva', 'joao@sigol.com.br', 'OP1001', 'OPERADOR', crypt('sigol123', gen_salt('bf'))),
  ('Pedro Santos', 'pedro@sigol.com.br', 'TEC001', 'TÉCNICO', crypt('sigol123', gen_salt('bf'))),
  ('Maria Souza', 'maria@sigol.com.br', 'FAT001', 'FATURAMENTO', crypt('sigol123', gen_salt('bf'))),
  ('Carlos Oliveira', 'carlos@sigol.com.br', 'GER001', 'GERÊNCIA', crypt('sigol123', gen_salt('bf'))),
  ('Ana Costa', 'ana@sigol.com.br', 'OP1002', 'OPERADOR', crypt('sigol123', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;

INSERT INTO colaboradores (registro, nome, funcao, equipe) VALUES
  ('OP1001', 'João Silva', 'Operador de Harvester', 'Equipe Alfa'),
  ('OP1002', 'Ana Costa', 'Operador de Forwarder', 'Equipe Beta'),
  ('OP1003', 'Marcos Ribeiro', 'Operador de Feller Buncher', 'Equipe Alfa'),
  ('OP1004', 'Paula Fernandes', 'Operador de Harvester', 'Equipe Gama'),
  ('OP1005', 'Rodrigo Lima', 'Ajudante Florestal', 'Equipe Beta')
ON CONFLICT (registro) DO NOTHING;

INSERT INTO equipamentos (frota, tipo, chave, ni, valor_hora) VALUES
  ('FRT-101', 'Harvester John Deere 1270G', 'CHV-HD1270', 'NI-98721', 320),
  ('FRT-102', 'Forwarder Komatsu 895', 'CHV-FW895', 'NI-65431', 280),
  ('FRT-103', 'Harvester Ponsse Ergo', 'CHV-HPON', 'NI-12345', 350),
  ('FRT-104', 'Feller Buncher CAT 521B', 'CHV-FB521', 'NI-55612', 380),
  ('FRT-105', 'Chipping Truck Wood', 'CHV-CTWOOD', 'NI-44510', 190)
ON CONFLICT (frota) DO NOTHING;

INSERT INTO cadastro_florestal (up, fazenda, area, nucleo) VALUES
  ('UP-201', 'Fazenda Bela Vista', 12.5, 'Núcleo Sul'),
  ('UP-202', 'Fazenda Bela Vista', 15.0, 'Núcleo Sul'),
  ('UP-304', 'Fazenda Monte Alegre', 24.8, 'Núcleo Norte'),
  ('UP-405', 'Fazenda Refúgio', 8.4, 'Núcleo Oeste'),
  ('UP-101', 'Fazenda Primavera', 18.2, 'Núcleo Leste');
