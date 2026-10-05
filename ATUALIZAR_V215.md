# Resenha 2.15.0 — ficha da Escolinha e trocas de função

## Controle de mensalidades

- Visão anual compacta com os 12 meses do ano atual.
- Resumo de total pago e total em aberto.
- Valor mensal calculado conforme Pagante, Bolsista 50% ou Bolsista 100%.
- Status Pago/Pendente, vencimento e data do pagamento.
- Ação rápida para registrar pagamento ou voltar para pendente.
- Layout em tabela no computador e cards no celular.
- Mantida a estrutura existente de `paymentHistory`, sem migração de banco.

## Ficha e PDF

- Formulário da ficha reorganizado visualmente com seções mais claras.
- PDF completo atualizado para o novo padrão profissional.
- Controle anual de mensalidades incluído no PDF exportado.
- Ficha em branco continua disponível para novos alunos.

## Partida

- A substituição agora lista banco e atletas que já estão em campo.
- Atletas em campo podem trocar de função sem alterar a escalação.
- Uma troca envolvendo o goleiro transfere a função e registra o período de cada atleta no gol.
- O acontecimento aparece no histórico da partida e no portal público.

## Atualização

Preserve o arquivo `.env` e os _secrets_ configurados no GitHub. Depois execute:

```bash
npm install
npm run build
```
