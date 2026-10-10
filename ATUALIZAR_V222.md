# Atualização 2.22.0

- nomes personalizados para cada equipe na divisão manual;
- nomes salvos separadamente em cada grupo;
- siglas geradas automaticamente para botões e placares;
- nomes personalizados mantidos na escalação, partida, times reservas, histórico e portal público;
- nomes padrão usados automaticamente quando o campo ficar vazio;
- campos responsivos para dois a seis times.

## Ajuste de justiça do ranking

- atleta novo começa com zero pontos, zero partidas e sem estrelas;
- todos aparecem na carreira desde o cadastro, começando com nota, pontos e estrelas zerados;
- a nota de carreira usa média ajustada para reduzir distorções por poucas partidas;
- o sorteio equilibrado considera força zero para atletas ainda sem histórico;
- o Mural público segue a mesma regra após atualizar o banco com `supabase/schema.sql`.
- bônus automáticos: sequência ofensiva +0,30, duas defesas de pênalti +0,50 e três vitórias seguidas +0,40;
- o destaque manual da partida foi removido;
- o ranking de goleiros mantém todos os jogadores visíveis, inclusive com valores zerados.

## Descoberta nos buscadores

- título e descrição ampliados com termos relacionados ao QResenha;
- dados estruturados de aplicativo esportivo;
- `robots.txt` e `sitemap.xml` prontos para o domínio oficial.
- o GitHub Actions agora interrompe a publicação se esses dois arquivos não entrarem no build.
