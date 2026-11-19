# Leve — instruções para o Claude

Leia também o `AGENTS.md` (regras da Expo para este SDK).

- Projeto **pessoal** do Gabriel, não é da Quorin Labs. Repositório **público** em https://github.com/gabrielmgsilva/leve (conta pessoal `gabrielmgsilva`, não a org Quorin-Labs). Commit e push só quando ele pedir. Por ser público: nada de dados pessoais, chaves, senhas ou e-mails nos arquivos e nos commits.
- A especificação em `docs/` é a fonte da verdade. Leia o documento da área antes de implementar. Se mudar uma regra, atualize o documento na mesma alteração.
- Só Android, instalado por APK. Sem login, conta ou biometria.
- Expo SDK 58: rotas em `src/app/`, abas de `expo-router/js-tabs` (o `Tabs` de `expo-router` está depreciado). Confira a doc da versão antes de usar uma API da Expo.
- Banco: `expo-sqlite` com SQL direto, 7 tabelas (`docs/03-arquitetura.md` § 4). Gramas, microgramas, milímetros, centavos e datas em texto local `AAAA-MM-DD HH:MM`. Não grave nada que dê para calcular. Migração nova = item novo no fim de `MIGRATIONS` (nunca altere um já publicado).
- A entrada é o `index.ts` da raiz: registra as tarefas do Android (botões do lembrete, widget) antes do `expo-router/entry`. A pasta `android/` é gerada pelo `npx expo prebuild`; nada à mão lá (mudança nativa = config plugin em `plugins/`).
- APK de release é assinado com a chave própria do Leve (`plugins/withReleaseSigning.js`; chave e senhas fora do projeto, `docs/03-arquitetura.md` § 10). Nunca crie outra chave nem mude a assinatura: o APK deixaria de instalar por cima do app dela. APK de homologação ou de uso real sai sem `EXPO_PUBLIC_DEMO`.
- Regras de negócio só em `src/domain`, como funções puras e testadas (`*.test.ts` ao lado). Componentes não calculam. O domínio só importa código puro (nada de `react-native` ou `expo-*`), para os testes rodarem no Node.
- UI e textos em pt-BR (vírgula decimal, dd/mm, "−" para negativos). Código, arquivos e identificadores em inglês.
- Cores, tipografia e espaçamentos só via `src/theme/tokens.ts`.
- Dependências com `npx expo install`; cada pacote novo precisa de motivo. Mantenha `react-dom` em 19.3.0 (ver `docs/03-arquitetura.md` § 1).
- Antes de entregar: `npx tsc --noEmit`, `npx expo lint` e `npm test` (testes de `src/domain` e `src/lib` com `node:test` + `tsx`).
- O app registra e lembra; nunca recomenda nem altera dose sozinho. Texto que cita a bula leva "confirme com seu médico".
