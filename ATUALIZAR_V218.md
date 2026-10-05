# Atualização 2.18.0

Substitua os arquivos do projeto pelos desta versão e execute:

```bash
npm install
npm run build
```

Depois envie as alterações ao GitHub. O fluxo de publicação existente executará a nova compilação.

## Principais alterações

- novo símbolo aplicado ao site, favicon, instalação PWA, mural, notificações e rodapé;
- contraste dourado/claro atrás do símbolo para manter a leitura nos dois temas;
- estrutura de pastas, componentes e documentação reorganizada em português;
- cestas de basquete com seleção de 1 ou 3 pontos;
- e-mail na ficha do atleta e compartilhamento do PDF pelo menu nativo do celular;
- altura em metros com vírgula, incluindo conversão dos cadastros antigos em centímetros;
- histórico do Mural exibido por seletor, uma partida de cada vez;
- pênalti defendido e assistência do goleiro valorizados na avaliação.

## Observação sobre envio por e-mail

No celular, navegadores compatíveis abrem o compartilhamento com o PDF anexado. No computador, por segurança, o navegador baixa o PDF e abre o aplicativo de e-mail; o usuário deve anexar o arquivo baixado. Envio totalmente automático exige um serviço de e-mail no servidor, e não deve expor chaves secretas no React.

Os nomes dos campos persistidos no Supabase foram mantidos para preservar todos os dados existentes. A organização visual do código, os componentes e a documentação estão em português.
