# Histórico de fornecedores — primeira versão

Briefing aprovado pelo usuário em 04/11/2026, com autorização para implementar.

## Objetivo e escopo

Novo módulo interno para administradores e funcionários, com uma grid de fornecedores e uma página de detalhamento. Reutilizar cadastro, compras, adiantamentos, abatimentos e comprovantes existentes. Não alterar regras financeiras nem criar uma nova modelagem de movimentações.

## Abordagem

Manter o cadastro atual e acrescentar `Histórico de fornecedores` no menu interno. Reutilizar a listagem existente de fornecedores e acrescentar uma consulta protegida por fornecedor para consolidar histórico, indicadores e gráficos. A agregação na API mantém os cálculos e a autorização centralizados; evita carregar todas as compras de todos os fornecedores no navegador.

## Comportamento

- `/supplier-history`: código, nome/razão social, PF/PJ, telefone e e-mail; busca e paginação; cada linha abre o fornecedor.
- `/supplier-history/:supplierId`: cadastro completo, saldos atuais, filtros e histórico em ordem decrescente.
- Filtros opcionais: início/fim, compras/adiantamentos/todos, situação atual dos adiantamentos. Guardados na URL. Inicialmente todo o histórico.
- Indicadores do resultado filtrado: compras, peso, valor, adiantamentos registrados e abatimentos. Saldos atuais permanecem independentes dos filtros.
- Gráficos mensais de compras e adiantamentos registrados, com alternativa tabular acessível. Não representam fluxo de caixa: compras e adiantamentos não são somados entre si.
- Abatimentos são detalhes das compras, sem duplicar o valor da compra no histórico.
- Comprovantes e campos da compra/adiantamento ficam disponíveis ao expandir a movimentação.
- Estados de carregamento, erro com nova tentativa, cadastro inexistente e histórico vazio.
- API e páginas exclusivas para `admin` e `employee`. Fornecedores continuam com o portal existente.

## Visual e implementação

Usar React, Tailwind, Lucide, Flask e SQLAlchemy existentes. Sem nova dependência de produção. Gráficos em SVG com legendas e valores acessíveis. Preservar tipografia Segoe UI, superfícies brancas, bordas amber-100, dourados #b8891f/#d6ab4a, texto #0f172a e sidebar #1e1608. Alinhamento à esquerda e números à direita nas tabelas. Componentes pequenos por responsabilidade.

## Limite dos dados

Não há trilha completa das edições manuais de saldo. Mostrar somente registros existentes e saldo atual; não inferir pagamentos, liquidações históricas ou saldos retroativos. A situação do adiantamento é atual, mesmo quando filtrado por data de registro.
