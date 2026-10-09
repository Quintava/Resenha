# Publicação do QResenha

Esta é a versão 2.22, anterior ao sistema de planos pagos, preparada para o domínio oficial.

## 1. Substituir os arquivos no GitHub

Substitua os arquivos do repositório pelos arquivos desta pasta. Não envie `node_modules` nem
`dist`; o GitHub Actions gera o site automaticamente.

## 2. Conferir o GitHub Pages

Em **Settings → Pages**:

- selecione **GitHub Actions** em _Source_;
- informe `www.qresenha.com.br` em _Custom domain_;
- depois da validação do DNS, ative **Enforce HTTPS**.

O arquivo `public/CNAME` já está configurado e será incluído automaticamente na publicação.

## 3. Conferir os segredos

Em **Settings → Secrets and variables → Actions**, mantenha:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Nunca coloque a chave `service_role` no GitHub ou no código do navegador.

## 4. Autorizar o novo endereço no Supabase

Em **Authentication → URL Configuration** use:

- **Site URL:** `https://www.qresenha.com.br`;
- **Redirect URLs:** `https://www.qresenha.com.br/**` e `https://qresenha.com.br/**`.

O endereço local `http://localhost:5173/**` pode permanecer autorizado para desenvolvimento.

## 5. Publicar

```bash
git add .
git commit -m "Publica QResenha no domínio oficial"
git push
```

Na aba **Actions**, aguarde o fluxo **Publicar no GitHub Pages** terminar com sucesso.
