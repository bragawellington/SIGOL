-- ============================================
-- SIGOL — Correções e melhorias
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Preencher fazenda/nucleo/area_up nos lançamentos antigos
UPDATE lancamentos l
SET 
  fazenda = cf.fazenda,
  nucleo = cf.nucleo,
  area_up = cf.area
FROM cadastro_florestal cf
WHERE l.up = cf.up
  AND (l.fazenda IS NULL OR l.fazenda = '' OR l.fazenda = '0');

-- 2. Preencher equipamento nos lançamentos que estão NULL
UPDATE lancamentos l
SET equipamento = e.tipo
FROM equipamentos e
WHERE l.frota = e.frota
  AND (l.equipamento IS NULL OR l.equipamento = '');

-- 3. Calcular rendimento retroativo onde está NULL
UPDATE lancamentos
SET rendimento = CASE 
  WHEN area_up > 0 AND (horimetro_final - horimetro_inicial) > 0 
  THEN ROUND((horimetro_final - horimetro_inicial) / area_up, 4)
  ELSE 0 
END
WHERE rendimento IS NULL OR rendimento = 0;

-- 4. Tabela de sequência para número de boletim
CREATE TABLE IF NOT EXISTS sequencias (
  id TEXT PRIMARY KEY,
  valor INTEGER NOT NULL DEFAULT 0
);

INSERT INTO sequencias (id, valor) VALUES ('boletim', 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE sequencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública" ON sequencias FOR SELECT USING (true);
CREATE POLICY "Permitir update autenticado" ON sequencias FOR UPDATE USING (true) WITH CHECK (true);

-- RPC para gerar próximo número sequencial (atômico)
CREATE OR REPLACE FUNCTION proximo_boletim()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  novo_valor INTEGER;
BEGIN
  UPDATE sequencias SET valor = valor + 1 WHERE id = 'boletim' RETURNING valor INTO novo_valor;
  RETURN novo_valor;
END;
$$;

GRANT EXECUTE ON FUNCTION proximo_boletim() TO anon, authenticated;

-- RPC para resetar senha de um usuário
CREATE OR REPLACE FUNCTION resetar_senha(p_codigo TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE usuarios
  SET senha_hash = crypt('sigol123', gen_salt('bf')),
      senha_alterada = false
  WHERE codigo = UPPER(p_codigo);
END;
$$;

GRANT EXECUTE ON FUNCTION resetar_senha(TEXT) TO anon, authenticated;

-- 5. Flag de troca de senha obrigatória
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_alterada BOOLEAN DEFAULT false;

-- 6. Registro de manutenção nos equipamentos
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS em_manutencao BOOLEAN DEFAULT false;
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS manutencao_tipo TEXT;
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS manutencao_inicio TIMESTAMPTZ;

-- 7. GPS na aprovação
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS aprovado_lat NUMERIC(10,6);
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS aprovado_lng NUMERIC(10,6);

-- Marcar usuários existentes como não-alterada
UPDATE usuarios SET senha_alterada = false WHERE senha_alterada IS NULL;

-- 8. RPC para sincronizar cadastro florestal nos lançamentos
CREATE OR REPLACE FUNCTION sincronizar_cadastro()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  registros_atualizados INTEGER;
BEGIN
  -- Preencher fazenda/nucleo/area nos lançamentos que estão vazios
  UPDATE lancamentos l
  SET fazenda = cf.fazenda, nucleo = cf.nucleo, area_up = cf.area
  FROM cadastro_florestal cf
  WHERE l.up = cf.up AND (l.fazenda IS NULL OR l.fazenda = '' OR l.fazenda = '0');

  GET DIAGNOSTICS registros_atualizados = ROW_COUNT;

  -- Preencher equipamento onde está vazio
  UPDATE lancamentos l
  SET equipamento = e.tipo
  FROM equipamentos e
  WHERE l.frota = e.frota AND (l.equipamento IS NULL OR l.equipamento = '');

  -- Recalcular rendimento onde está zerado mas tem área
  UPDATE lancamentos
  SET rendimento = ROUND((horimetro_final - horimetro_inicial) / area_up, 4)
  WHERE area_up > 0 AND (rendimento IS NULL OR rendimento = 0)
    AND horimetro_final > horimetro_inicial;

  RETURN registros_atualizados;
END;
$$;

GRANT EXECUTE ON FUNCTION sincronizar_cadastro() TO anon, authenticated;
