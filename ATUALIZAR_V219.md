# Atualização 2.19.0

## Alterações

- o compartilhamento envia a ficha de cadastro vazia para preenchimento;
- o PDF completo continua disponível somente no botão de exportação da ficha já cadastrada;
- fundo do símbolo “R” verde no tema claro e dourado no tema escuro;
- classificação de futebol selecionável entre jogadores de linha e goleiros;
- ranking de goleiros com jogos no gol, defesas, média de defesas e avaliação da função;
- painel mensal de futebol inclui o ranking de defesas;
- o destaque “Paredão” fica vazio quando nenhuma defesa foi registrada;
- modo Amador exibe apenas o símbolo “R”, sem alternância de imagens;
- botão “Adicionar grupo” alinhado ao tamanho do seletor de grupos.

## Publicação

Substitua os arquivos e execute:

```bash
npm install
npm run build
git add .
git commit -m "Atualiza rankings e ficha de cadastro"
git push
```
