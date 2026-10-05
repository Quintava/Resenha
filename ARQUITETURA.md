# Arquitetura do Resenha

O projeto separa apresentação, regras esportivas e persistência. Essa divisão evita que uma alteração visual afete os cálculos de avaliação ou a sincronização com o Supabase.

## Fluxo principal

1. `main.jsx` inicia o React e instala a proteção contra erros de renderização.
2. `App.jsx` monta somente `<AplicativoResenha />`.
3. `paginas/AplicativoResenha.jsx` coordena sessão, estado e navegação.
4. Os componentes de `componentes/` recebem dados e eventos por propriedades.
5. As regras puras de `dominio/` calculam avaliações, normalizam dados e formam times.
6. `servicoDados.js` é a única camada responsável por persistir e carregar dados remotos.

## Pastas

| Pasta                      | Responsabilidade                               |
| -------------------------- | ---------------------------------------------- |
| `componentes/autenticacao` | Entrada, cadastro e recuperação de senha       |
| `componentes/comuns`       | Componentes compartilhados em várias telas     |
| `componentes/estrutura`    | Menu principal, perfil e rodapé                |
| `componentes/partida`      | Elementos da partida e registro de lances      |
| `componentes/estatisticas` | Rankings e tabelas de desempenho               |
| `componentes/treinador`    | Ficha do atleta e controle de mensalidades     |
| `configuracao`             | Constantes e estado inicial                    |
| `dominio`                  | Regras de negócio sem dependência da interface |
| `paginas`                  | Coordenação das telas e fluxos completos       |
| `utilitarios`              | Funções genéricas pequenas e reutilizáveis     |

## Como adicionar uma funcionalidade

- Um novo elemento visual reutilizável deve entrar em `componentes/`.
- Uma nova regra de pontuação deve entrar em `dominio/estatisticasJogador.js`.
- Uma nova modalidade ou valor sugerido deve entrar em `configuracao/configuracaoAplicativo.js` e `dominio/esportes.js`.
- Uma nova operação no banco deve entrar em `servicoDados.js`, nunca diretamente dentro de um componente.
- `App.jsx` deve continuar pequeno e sem regras de negócio.

## Convenções

- Componentes usam `PascalCase`: `CartaoTime`, `TelaAutenticacao`.
- Funções e variáveis usam `camelCase`: `sortearTimes`, `desempenhoJogador`.
- Arquivos de componentes usam `.jsx`; regras sem JSX usam `.js`.
- Comentários explicam decisões e regras; não repetem o que o código já diz.
- Antes de entregar uma alteração, execute `npm run format:check` e `npm run build`.
