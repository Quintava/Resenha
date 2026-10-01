# Resenha

Site em React para organizar jogos com amigos, controlar a partida e fechar a artilharia de cada mês.

## Como executar

Instale o Node.js 20.19 ou mais recente. Depois, abra esta pasta no VS Code e execute no terminal:

```bash
npm install
npm run dev
```

O navegador deve abrir automaticamente. Se não abrir, acesse o endereço mostrado no terminal, normalmente `http://localhost:5173`.

Se uma tentativa antiga deixou uma pasta `node_modules` incompleta, apague somente essa pasta e execute `npm install` novamente.

## Recursos

- cadastro de jogadores sem avaliação manual;
- nível geral automático de 1 a 5 estrelas, baseado em uma avaliação esportiva de 0 a 10;
- avaliação acumulada salva no cadastro, considerando inclusive as partidas antigas;
- sorteio equilibrado pela média decimal de desempenho, com nota neutra para estreantes;
- nível do último jogo para acompanhar a evolução recente;
- confirmação de presença antes de cada partida;
- registro de presença no histórico de cada jogo;
- sorteio aleatório, equilibrado pelo desempenho ou divisão manual dos times;
- lista de jogadores com 10 nomes por página, sem recarregar o site;
- goleiros fixos opcionais no dia, separados automaticamente entre os times;
- escolha de goleiro fixo em lista recolhível, sem ocupar espaço permanente na configuração;
- tempo e quantidade de titulares configuráveis;
- cronômetro regressivo, placar, autor dos gols e assistências;
- placar ampliado com faixa de autores, minutos e assistências das pontuações;
- registro de gol contra e pênalti perdido, com correção pela súmula;
- titulares, banco, substituições e até 4 times de fora durante a resenha;
- troca de goleiro com atleta da linha ou do banco e registro do tempo na posição;
- menu individual de lances ao tocar em cada titular, adaptado para jogador de linha ou goleiro;
- avaliação de goleiro por defesas, defesas difíceis, pênaltis defendidos, gols sofridos e falhas;
- salvamento de cada partida sem perder a escalação, deixando a rodada seguinte pronta;
- troca de um time completo por outro da fila e encerramento separado da sessão;
- opção de reservas vinculados, em que cada time utiliza somente o próprio banco;
- opção de **Banco geral da resenha**, liberando qualquer reserva para substituições manuais nos dois times;
- banco geral destacado na partida e disponível também durante a troca manual de goleiro;
- súmula com minuto de cada lance e botão visível para anular uma pontuação lançada por engano;
- finalização compacta da partida ou da resenha logo abaixo dos lances do jogo;
- histórico de partidas e artilharia separada por mês;
- salvamento automático no navegador;
- sincronização com Supabase entre celulares, organizada dentro das configurações;
- tela inicial obrigatória de login;
- contas protegidas por e-mail e senha;
- recuperação de senha por link enviado ao e-mail;
- perfil individual com nome e inicial gerada automaticamente;
- menu hambúrguer com as áreas esportivas do aplicativo;
- menu de conta com perfil, configurações, troca de senha e saída;
- alteração de senha com validação da senha atual e confirmação da nova;
- edição ou exclusão de jogadores somente nas configurações, com confirmação antes de apagar;
- edição e exclusão de partidas salvas;
- jogadores e históricos separados por usuário;
- exportação e importação de backup em JSON;
- modo claro e modo escuro com preferência salva.
- página de evolução mensal por jogador, com presenças, pontuações, assistências, média e nível de cada partida;
- página de evolução mensal redesenhada, com seleção destacada de atleta e período;
- Futebol, Futebol Society e Futebol de Salão com rankings geral, de assistências e de gols;
- Vôlei com ranking exclusivo de pontos e Basquete com ranking de cestas;
- configuração automática de jogadores e tempo ao selecionar cada modalidade, mantendo os campos editáveis;
- sincronização incremental: um novo gol cria somente o registro daquele lance, sem reenviar o histórico;
- histórico carregado em páginas de 10 partidas;
- Mural da Resenha somente para leitura, com link travado por modalidade, destaques, média por jogo, próximos jogos e resultados;
- Mural com rankings públicos de carreira, média mensal e desempenho de cada partida;
- próximo jogo destacado no Mural em um card esportivo responsivo para computador, tablet e celular;
- súmula pública expansível com minuto, autores e acontecimentos de cada partida;
- classificação completa por esporte com pontuações, assistências, presenças e avaliação geral;
- classificação conectada em três visões: carreira, média mensal e nota de cada partida;
- defesas totais e média de defesas por jogo nos rankings de futebol;
- estatísticas organizadas em páginas internas separadas para classificação, pontuadores e resultados.

O login depende do Supabase. Para configurar o banco e a autenticação, siga o arquivo `CONFIGURAR_SUPABASE.md`.

## Organização do código

- `src/App.jsx`: ponto de entrada visual; apenas monta a página `<ResenhaApp />`;
- `src/pages/ResenhaApp.jsx`: coordena estado, navegação e os fluxos autenticados;
- `src/components/auth/`: login, cadastro e recuperação de senha;
- `src/components/layout/`: menu, cabeçalho, perfil e rodapé;
- `src/components/match/`: placar, times, jogadores e lances da partida;
- `src/components/stats/`: classificação e tabelas de desempenho;
- `src/components/common/`: peças reutilizáveis, como modal, avatar e paginação;
- `src/config/`: valores iniciais, modalidades e constantes do aplicativo;
- `src/domain/`: regras de avaliação, estado, esportes e montagem dos times;
- `src/utils/`: funções genéricas de data, cronômetro e identificação;
- `src/PublicPage.jsx`: Mural da Resenha, público e somente para leitura;
- `src/dataService.js`: leitura, paginação e sincronização incremental com o Supabase;
- `src/supabase.js`: criação e configuração segura do cliente Supabase;
- `src/styles.css`: temas, componentes visuais e responsividade;
- `supabase/schema.sql`: tabelas, políticas de segurança e funções públicas do banco;
- `public/`: ícones, manifesto e arquivos estáticos.

Os comentários indicam responsabilidades, regras de negócio e pontos de segurança sem repetir instruções óbvias.
Consulte também `ARQUITETURA.md` antes de criar uma nova tela ou regra.

Para conferir a formatação sem alterar arquivos:

```bash
npm run format:check
```

Para formatar novamente todo o projeto:

```bash
npm run format
```

## Segurança

- o site usa apenas a chave pública do Supabase no navegador;
- as tabelas administrativas possuem RLS e restringem cada linha ao dono da conta;
- visitantes anônimos acessam somente a função pública de leitura, sem permissão direta nas tabelas;
- nenhuma chave `service_role` ou `sb_secret_` deve ser colocada no GitHub;
- backups importados são validados, possuem limite de 2 MB e exigem confirmação;
- o HTML inclui uma política de conteúdo que bloqueia scripts e conexões fora das origens permitidas.

Ao atualizar uma instalação existente, execute novamente todo o conteúdo de `supabase/schema.sql` no SQL Editor. O script cria tabelas novas sem apagar `app_state`; a migração ocorre automaticamente no primeiro login.

## Sugestões automáticas por esporte

Ao selecionar uma modalidade, o aplicativo preenche automaticamente a quantidade de jogadores em jogo e a duração sugerida: Futebol (11 e 20 minutos), Futebol Society (5 e 10 minutos), Futebol de Salão (5 e 10 minutos), Vôlei (2 e 15 minutos), Basquete (5 e 10 minutos) e Handebol (7 e 20 minutos). Esses dois campos continuam editáveis.

## Como funciona a avaliação

Cada presença começa com nota 6,0. Gol, ponto ou cesta soma 0,55 e, no futebol, a assistência soma 0,30. O bônus ofensivo fica limitado a 2,0 por partida. Vitória soma 0,35, empate soma 0,15 e derrota desconta 0,15. O destaque da partida ganha 0,30. Gol contra desconta 0,40 e pênalti perdido desconta 0,30. A nota final fica entre 3,0 e 10,0.

No gol, uma defesa normal soma 0,12, uma difícil soma 0,30 e um pênalti defendido soma 0,70. Falha desconta 0,45 e cada gol sofrido desconta 0,08, limitado a 0,40 por partida. Se o goleiro atuar em pelo menos metade do jogo sem sofrer gol, ganha até 0,40 proporcional ao tempo na posição.

A nota vira nível visual: abaixo de 6,0 vale 1 estrela; de 6,0 a 6,7 vale 2; de 6,8 a 7,5 vale 3; de 7,6 a 8,4 vale 4; e a partir de 8,5 vale 5. A classificação pode ser vista por partida, por mês ou por toda a carreira na modalidade.

O cadastro guarda os acumulados por esporte. Na primeira abertura desta versão, eles são reconstruídos usando todo o histórico da conta. O sorteio equilibrado combina 70% da média das últimas dez atuações com 30% da média geral estabilizada; estreantes entram provisoriamente com nota 6,0.

## Rodadas da mesma resenha

Use **Salvar partida e continuar** ao final de cada jogo curto. O resultado entra no histórico e uma nova partida é aberta com a mesma escalação, bancos e times de fora. Use **Encerrar resenha** somente quando o período inteiro de jogos terminar.

## Recuperação de senha

Na tela de entrada, informe o e-mail e clique em **Esqueci minha senha**. O Supabase enviará um link que volta para o site e abre a criação da nova senha. O endereço publicado precisa estar cadastrado em **Authentication > URL Configuration > Redirect URLs**, conforme o guia de configuração.
