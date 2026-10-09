# Atualização 2.6 — múltiplos grupos

Esta versão separa jogadores, partidas, rankings, estatísticas, agenda e mural por grupo.

## 1. Atualize o banco

1. Abra o painel do seu projeto no Supabase.
2. Entre em **SQL Editor** e crie uma nova consulta.
3. Copie todo o conteúdo de `supabase/schema.sql` deste projeto.
4. Cole no editor e clique em **Run**.

O script é uma migração: ele não apaga os dados atuais. Tudo o que já existe será vinculado ao
**Grupo principal**.

## 2. Publique os arquivos

Substitua os arquivos do projeto no GitHub e confirme o commit. O workflow existente fará o build
e a publicação no GitHub Pages.

## 3. Teste

1. Entre com sua conta.
2. Use o seletor **Grupo atual** logo abaixo do cabeçalho.
3. Crie um segundo grupo e cadastre um jogador de teste.
4. Volte ao primeiro grupo e confirme que seus dados originais continuam nele.
5. Ative o Mural em cada grupo e confirme que cada espaço recebe seu próprio link.

O nome e a exclusão do grupo atual ficam em **Perfil → Configurações → Grupo atual**. Não é
possível excluir o último grupo da conta.
