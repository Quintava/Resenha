# Resenha 2.16.2 — ficha simplificada e modalidades isoladas

## Ficha do atleta

- Navegação em três abas: Dados do aluno, Saúde e segurança e Mensalidade.
- Data de nascimento calcula a idade automaticamente.
- Categoria selecionável entre grupos e categorias existentes.
- A criação de grupos foi retirada da ficha; novos grupos são administrados na área própria.
- Campo de experiência removido.
- Telefone de emergência formatado como `(00) 00000-0000`.
- PDFs em branco e preenchido não incluem mensalidades ou pagamentos.

## Mensalidades

- Filtros por ano, mês e status Pago/Pendente.
- Novos alunos começam com a categoria de pagamento “Pagante”.
- Resumo anual e ações rápidas preservados apenas no ambiente autenticado.

## Modos e navegação

- “Escolinha” renomeada para “Modo Treinador”.
- Seletor transformado em botões visuais Amador/Treinador.
- Modo Amador alterna as imagens das modalidades; Treinador usa o mascote.
- Trocar modo ou grupo preserva a página atual.
- Campeonato removido.
- Notificações usam o mesmo emblema do crédito no rodapé.

## Rankings

- Pontos, cestas, gols e assistências são tratados conforme a modalidade.
- Assistências e estatísticas de goleiro aparecem somente no futebol.
- Cada modalidade mantém carreira, mês, partidas e link público próprios.
- No Modo Treinador, a presença acrescenta `+0,20` à avaliação da partida.
- Modalidades antigas ou inválidas salvas no navegador ou na nuvem são migradas automaticamente.

## Atualização

Preserve o `.env` e os _secrets_ do GitHub. Depois execute:

```bash
npm install
npm run build
```
