# Segurança do Resenha

## Proteções implementadas

- autenticação administrada pelo Supabase;
- isolamento por usuário com Row Level Security em todas as tabelas;
- página pública acessível somente por função de leitura com campos controlados;
- execução das funções SQL concedida apenas aos papéis necessários;
- validação e limite de tamanho para registros, eventos e backups;
- sincronização incremental em vez de reenviar todo o histórico;
- política de conteúdo, bloqueio de iframe, HTTPS obrigatório e demais cabeçalhos;
- mensagens de autenticação sem detalhes internos do provedor;
- reautenticação real antes da troca de senha;
- cache local da conta removido no logout;
- proteção contra múltiplos envios do formulário de login;
- nenhuma chave administrativa dentro do frontend.

## Dados públicos

O Mural da Resenha mostra nomes e estatísticas dos jogadores quando o dono da conta o ativa. Antes de compartilhar o link, os participantes devem estar cientes dessa exposição. Desativar o mural interrompe imediatamente a consulta pública.

## Dados de saúde da Escolinha

As fichas técnicas e médicas permanecem no núcleo privado da organização, protegido por login e
RLS do Supabase. A função que alimenta o portal público não lê nem retorna esses campos. Por se
tratarem de dados pessoais sensíveis, mantenha somente informações necessárias, limite o acesso à
conta responsável pela gestão e obtenha autorização do responsável legal pelo aluno.

## Responsabilidade operacional

As chaves públicas do Supabase podem aparecer no navegador; isso é esperado. A segurança depende das políticas RLS. Chaves `service_role`, `sb_secret_`, credenciais SMTP e acessos administrativos nunca podem entrar no GitHub ou em variáveis que comecem com `VITE_`.

Nenhuma revisão de código elimina todo risco. Antes de uma divulgação grande, execute o Security Advisor do Supabase, habilite CAPTCHA, configure SMTP próprio e faça testes com contas independentes.
