# Atualização 2.10 — notificações da Escolinha

## Correção 2.10.1

- O contador de notificações desaparece assim que o sino é aberto e permanece lido após atualizar a página.
- A mensalidade passou a ter valor e vencimento padrão para novos alunos.
- O formulário financeiro foi reorganizado em **Mensalidade**, **Pagamento do mês** e **Histórico**.
- O botão do formulário vazio agora se chama **Ficha cadastro**.
- A estrutura interna dos PDFs foi corrigida e validada no formato A4.

## Correção 2.10.2

- A **Ficha cadastro** foi redesenhada como formulário profissional em uma página A4.
- Os campos agora usam caixas de preenchimento e distribuição em colunas.
- Foram adicionadas opções de marcação para experiência e categoria de pagamento.
- A ficha ganhou declaração de veracidade, autorização de uso interno e áreas de assinatura.
- O documento continua neutro, sem nome ou logotipo do aplicativo.

## Avisos automáticos

- Mensalidade vencida de aluno pagante ou bolsista 50%.
- Aniversário do aluno na data atual.
- Janela de avisos exibida ao entrar na Escolinha, no máximo uma vez por dia para o mesmo conjunto de alertas.
- Sino no cabeçalho com contador e as quatro notificações mais recentes.

## Regras

- O recurso aparece somente no modo Escolinha.
- Alunos suspensos não geram notificações.
- Bolsistas 100% não geram aviso de mensalidade vencida.
- Mensalidades quitadas deixam de aparecer como pendentes.
- Vencimentos definidos para os dias 29, 30 ou 31 são ajustados ao último dia disponível do mês.

## Banco de dados

Não há alteração de estrutura no Supabase. As notificações são calculadas a partir das fichas privadas já salvas.
