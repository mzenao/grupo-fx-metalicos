# Dois gráficos de linhas por movimentação

Correção solicitada pelo usuário: manter os dois gráficos lado a lado em desktop, empilhados no celular. Uma linha de vendas e outra de adiantamentos. Cada ponto é um registro individual, inclusive quando há várias vendas na mesma data.

- Vendas: eixo vertical em R$; tooltip com identificação, data, valor da venda e preço registrado do kg daquela venda.
- Adiantamentos: eixo vertical em R$; tooltip com identificação, data e valor do adiantamento.
- Registros em ordem cronológica, com desempate por ID; cada registro tem uma posição própria no eixo horizontal.
- Preservar permissões e filtros atuais. Gráficos incluem todos os registros filtrados, independentemente da página do histórico.
- Remover comparação de duas escalas, médias diárias e agregação de pontos por dia. Sem mudança de modelagem ou dependências.
- Testar registros no mesmo dia/horário, preço individual, filtros, paginação, hover, teclado e celular.
