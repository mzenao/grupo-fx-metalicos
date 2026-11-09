# Supplier History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar listagem e análise por fornecedor restritas à equipe interna.

**Architecture:** Consulta SQLAlchemy por fornecedor com agregação decimal e paginação do histórico. React consome a consulta e reutiliza layout, autenticação e resolução de anexos existentes.

**Tech Stack:** Flask, SQLAlchemy, unittest/SQLite isolado; React, Tailwind, SVG, Vite.

**Spec:** `docs/superpowers/specs/2026-11-04-supplier-history-design.md`

## Global Constraints

- API e páginas exclusivas para `admin` e `employee`.
- Sem nova dependência de produção ou migração do banco.
- Preservar cadastro, regras financeiras e visual existentes.
- Saldos atuais independentes dos filtros; abatimentos não duplicam compras.
- Nenhum teste deve alterar o banco local do usuário.

## Review Focus

- Acesso de fornecedor, visitante e consulta de outro fornecedor: autorização e isolamento.
- Datas nos limites do dia, período invertido e parâmetros inválidos: validar sem erro 500.
- Valores decimais e abatimentos: evitar duplicidade e distinguir saldo atual de total filtrado.
- Sem movimentos e páginas fora do limite: zeros e navegação utilizável.
- Nomes longos, celular, teclado e falha/reordenação de requisições: layout e estado consistentes.

### Task 1: API de análise e testes

**Files:** criar `Back/app/services/supplier_history_service.py`, `Back/tests/test_supplier_history.py`; modificar `Back/app/routes/supplier_routes.py`.

**Interfaces:** `GET /api/suppliers/<id>/history?start=&end=&type=all|purchase|advance&status=all|pendente|finalizado&page=1`; retorna `supplier`, `balances`, `summary`, `series`, `movements`, `pagination`.

- [ ] Escrever testes HTTP com banco temporário: permissões, isolamento, totais conhecidos, filtros, datas inclusivas, paginação e vazio.
- [ ] Executar `../venv/bin/python -m unittest discover -s tests -v` e confirmar falha por rota ausente.
- [ ] Implementar consulta protegida, validação, agregação decimal, séries mensais e movimentos paginados de 20 itens.
- [ ] Executar os testes; todos devem passar.

### Task 2: Interface e integração

**Files:** criar `Front/src/pages/SupplierHistory.jsx`, `Front/src/pages/SupplierHistoryDetail.jsx`, `Front/src/components/internal/supplierHistory/*`, `Front/src/services/supplierHistoryData.js`; modificar `Front/src/App.jsx`, `Front/src/layout.jsx`.

**Interfaces:** lista usa `fetchSuppliers`; detalhe usa a API da Task 1, filtros na URL; anexos usam os resolvedores atuais.

- [ ] Confirmar ausência das rotas no navegador antes da implementação.
- [ ] Criar listagem com busca/paginação e navegação para o detalhe.
- [ ] Criar cadastro completo, filtros, resumos, gráficos e histórico expansível com comprovantes.
- [ ] Adicionar rotas protegidas e item no menu atual.
- [ ] Executar `npm run build`; verificar navegação, filtros, erro/vazio, teclado e celular no navegador.

### Task 3: Revisão e verificação final

- [ ] Revisão independente do diff, com foco em autorização, cálculos e coerência com a especificação.
- [ ] Corrigir defeitos relevantes com teste de regressão.
- [ ] Executar suíte completa do backend e build; verificar API com PostgreSQL em leitura e interface desktop/celular.

## Execução

- Autorização do usuário cobre o briefing e a implementação; execução direta nesta sessão.
- Trabalho no checkout atual para integrar ao frontend/backend que o usuário já mantém rodando. Não criar commits, branches ou publicar nesta entrega.
- Baseline: build do frontend aprovado (aviso preexistente de bundle >500 kB); arquivos de testes do backend vazios.
