-- Script para adicionar créditos ao workspace de desenvolvimento
-- Execute este script quando o workspace ficar sem créditos

-- Adiciona 50.000 créditos ao workspace (suficiente para ~25 gerações de estratégia)
UPDATE workspaces 
SET credits = credits + 50000 
WHERE id = 'd6df9a16-c207-4281-b409-432eb89fb49e';

-- Verificar saldo atual
SELECT id, name, credits FROM workspaces WHERE id = 'd6df9a16-c207-4281-b409-432eb89fb49e';

-- OU adicionar créditos a TODOS os workspaces (útil em dev)
-- UPDATE workspaces SET credits = 50000;
