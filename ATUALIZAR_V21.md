# Resenha 2.1 — rankings e avaliação justa

## Atualização obrigatória do Supabase

1. Abra o projeto no Supabase.
2. Entre em **SQL Editor**.
3. Copie todo o conteúdo de `supabase/schema.sql`.
4. Execute o script completo.

O script preserva os dados existentes, libera o evento de destaque da partida e atualiza o cálculo do Mural. No primeiro login, o aplicativo reconstrói os acumulados por modalidade usando todo o histórico salvo.

## O que mudou

- ranking geral da carreira por modalidade;
- média mensal para acompanhar o desempenho do período;
- ranking de cada partida;
- defesas totais e defesas por jogo para valorizar goleiros;
- nível em estrelas com novas faixas;
- sorteio equilibrado com 70% da fase recente e 30% da carreira estabilizada;
- explicação pública e transparente da pontuação no fim do Mural.

## Publicação

Substitua os arquivos do repositório, preserve os Secrets do Supabase e faça `commit` e `push`. O workflow de GitHub Pages publicará a versão com o endereço do repositório **Resenha**.
