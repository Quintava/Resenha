# Arquitetura do Resenha

O projeto separa apresentação, regras esportivas e persistência. Essa divisão evita que uma alteração visual afete os cálculos de avaliação ou a sincronização com o Supabase.

## Fluxo principal

1. `main.jsx` inicia o React e instala a proteção contra erros de renderização.
2. `App.jsx` monta somente `<ResenhaApp />`.
3. `pages/ResenhaApp.jsx` coordena sessão, estado e navegação.
4. Os componentes de `components/` recebem dados e eventos por propriedades.
5. As regras puras de `domain/` calculam avaliações, normalizam dados e formam times.
6. `dataService.js` é a única camada responsável por persistir e carregar dados remotos.

## Pastas

| Pasta               | Responsabilidade                               |
| ------------------- | ---------------------------------------------- |
| `components/auth`   | Entrada, cadastro e recuperação de senha       |
| `components/common` | Componentes compartilhados em várias telas     |
| `components/layout` | Menu principal, perfil e rodapé                |
| `components/match`  | Elementos da partida e registro de lances      |
| `components/stats`  | Rankings e tabelas de desempenho               |
| `config`            | Constantes e estado inicial                    |
| `domain`            | Regras de negócio sem dependência da interface |
| `pages`             | Coordenação das telas e fluxos completos       |
| `utils`             | Funções genéricas pequenas e reutilizáveis     |

## Como adicionar uma funcionalidade

- Um novo elemento visual reutilizável deve entrar em `components/`.
- Uma nova regra de pontuação deve entrar em `domain/playerStats.js`.
- Uma nova modalidade ou valor sugerido deve entrar em `config/appConfig.js` e `domain/sports.js`.
- Uma nova operação no banco deve entrar em `dataService.js`, nunca diretamente dentro de um componente.
- `App.jsx` deve continuar pequeno e sem regras de negócio.

## Convenções

- Componentes usam `PascalCase`: `TeamCard`, `AuthScreen`.
- Funções e variáveis usam `camelCase`: `drawTeams`, `playerPerformance`.
- Arquivos de componentes usam `.jsx`; regras sem JSX usam `.js`.
- Comentários explicam decisões e regras; não repetem o que o código já diz.
- Antes de entregar uma alteração, execute `npm run format:check` e `npm run build`.
