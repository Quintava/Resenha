# Publicação oficial do Resenha

## Arquitetura recomendada

- **Domínio:** Registro.br, preferencialmente um `.com.br` curto e ligado à marca.
- **DNS, HTTPS e hospedagem:** Cloudflare Pages conectado ao repositório GitHub.
- **Login e banco:** Supabase.
- **E-mails de confirmação e recuperação:** provedor SMTP próprio conectado ao Supabase.

Essa combinação mantém o site estático barato, entrega HTTPS automático e preserva o banco relacional e a autenticação já implementados.

## 1. Publicar no Cloudflare Pages

1. Crie uma conta na Cloudflare protegida por autenticação em dois fatores.
2. Em **Workers & Pages**, escolha **Create > Pages > Connect to Git**.
3. Conecte o repositório `Quintava/resenha`.
4. Use estas configurações:
   - comando de build: `npm run build`;
   - diretório de saída: `dist`;
   - versão do Node: `22`.
5. Cadastre as variáveis:
   - `VITE_SUPABASE_URL`;
   - `VITE_SUPABASE_PUBLISHABLE_KEY`.
6. Não é necessário configurar `VITE_BASE_PATH`. O projeto usa caminhos relativos e funciona na raiz do domínio ou em uma subpasta.
7. Faça o primeiro deploy e confira a URL temporária `pages.dev`.

O arquivo `public/_headers` aplica cabeçalhos de segurança e cache na Cloudflare. O arquivo `public/_redirects` mantém o React funcionando ao abrir endereços diretamente.

## 2. Registrar e conectar o domínio

1. Consulte e registre o domínio em `registro.br` no nome do proprietário do projeto.
2. No projeto da Cloudflare Pages, abra **Custom domains > Set up a domain**.
3. Informe o domínio principal, por exemplo `resenhaapp.com.br`.
4. Configure também `www` e escolha um deles como endereço principal.
5. Siga os registros DNS mostrados pela Cloudflare e aguarde a propagação.
6. Ative a renovação automática do domínio e a autenticação em dois fatores no Registro.br.

## 3. Preparar o Supabase para produção

1. Execute novamente todo o arquivo `supabase/schema.sql` no SQL Editor.
2. Em **Authentication > URL Configuration**:
   - defina **Site URL** como o domínio oficial com HTTPS;
   - inclua o domínio oficial em **Redirect URLs**;
   - mantenha `localhost` somente para desenvolvimento.
3. Mantenha a confirmação de e-mail ativada.
4. Em **Authentication > SMTP Settings**, configure um SMTP próprio. O servidor padrão do Supabase é apenas para testes.
5. Em **Authentication > Attack Protection**, configure CAPTCHA antes de divulgar cadastro livre.
6. Revise **Database > Security Advisor** e **Performance Advisor**.
7. Ative autenticação em dois fatores na conta administrativa do Supabase e do GitHub.
8. Nunca coloque `service_role`, `sb_secret_`, senha SMTP ou token administrativo em variável `VITE_`.

## 4. Testes antes da divulgação

- criar uma conta usando um e-mail externo;
- confirmar o e-mail e entrar pelo celular;
- recuperar e alterar a senha;
- cadastrar jogadores e iniciar uma partida;
- fechar e continuar uma rodada;
- abrir o mural em uma janela anônima;
- confirmar que uma conta não enxerga dados de outra;
- testar logout e novo login;
- testar sem internet e depois reconectar;
- exportar um backup JSON;
- conferir o site em Android, iPhone, tablet e computador.

## 5. Operação contínua

- acompanhe uso e alertas no painel do Supabase;
- exporte um backup JSON periodicamente enquanto estiver no plano gratuito;
- mantenha dependências atualizadas e execute `npm audit` antes de publicar versões;
- use uma branch de teste antes de alterar o banco de produção;
- documente incidentes e mantenha um e-mail de suporte visível aos usuários;
- publique um aviso de privacidade explicando que nomes, e-mails e estatísticas esportivas são armazenados.
