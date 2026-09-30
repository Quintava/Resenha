# Resenha 2.0 — atualização

> Ajuste 2.0.1: seleção de goleiros em lista recolhível e ações individuais abertas ao tocar no jogador durante a partida.

> Ajuste 2.0.2: finalização compacta na coluna de lances e Mural responsivo com chamada esportiva para o próximo jogo.

## Antes de publicar

1. Abra o projeto no Supabase.
2. Entre em **SQL Editor**.
3. Copie todo o conteúdo de `supabase/schema.sql`.
4. Execute o script. Ele mantém os dados atuais e libera os novos eventos de goleiro e a súmula pública.

## Publicação no GitHub Pages

Substitua os arquivos do repositório pelos desta pasta, mantendo os seus valores em `.env` ou nos **Secrets** do GitHub. Depois faça `commit` e `push`. O workflow em `.github/workflows/deploy.yml` fará a publicação.

O endereço público continua usando o repositório **resenha**. Para cada modalidade, copie o link pela tela **Mural da Resenha**; o esporte fica gravado no endereço e não pode ser trocado pelo visitante.

## Regras do goleiro

- Na preparação, marque até um goleiro fixo por time.
- O sorteio distribui esses goleiros em times diferentes e garante que comecem jogando.
- Durante a partida, o goleiro pode ser trocado por alguém da linha ou do banco.
- A nota considera minutos na posição, defesas, defesas difíceis, pênaltis defendidos, gols sofridos e falhas.
- A média histórica do goleiro é ponderada pelo tempo efetivamente jogado no gol.

## Verificação local

```bash
npm install
npm run dev
```

Para testar a versão de produção:

```bash
npm run build
npm run preview
```
