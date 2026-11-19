# Leve — Roadmap, decisões e riscos

## 1. Fases

| Fase | Entrega | Pronto quando |
|---|---|---|
| **0 · Fundação** *(pronta em 18/11)* | Projeto Expo + TypeScript + Router em `src/app`; tokens, fonte e tema claro/escuro; banco com migrações; menu flutuante com o +; componentes base; dados de demonstração | O app abre no Expo Go com as 4 abas e os dados de exemplo |
| **1 · Registrar** (MVP, parte 1) *(código pronto em 19/11; testado no emulador Android 17: onboarding com histórico retroativo, registro, edição e exclusão de aplicação e peso com Desfazer, Hoje nos quatro estados, caneta aberta e descontada, lembrete disparado na hora e toque abrindo o registro)* | Onboarding com histórico retroativo; registrar aplicação (mapa, rodízio, caneta); registrar peso (teclado); Hoje; lembretes; editar aplicações e pesagens (o mesmo formulário); lembretes nos Ajustes | H1–H6 de [01-produto.md](01-produto.md#7-histórias-principais-e-critérios-de-aceite) passam no aparelho |
| **2 · Acompanhar** (MVP, parte 2) *(código pronto em 19/11, feito antes da fase 1 a pedido do Gabriel; testado num emulador Android 17 com os dados de exemplo: telas, gráficos, exclusão com Desfazer, backup exportado, apagado e restaurado, tema escuro)* | Evolução (gráficos e resumo); Tratamento (plano, canetas, estoque, calendário, rodízio, histórico); Diário (sintomas, notas, linha do tempo); backup e restauração; Ajustes (perfil, dia e horário, plano, locais, aparência, IMC, dados) | **APK instalado no celular dela** e usado por 2 semanas |
| **3 · v1.1** (P1) *(código pronto em 19/11, a pedido do Gabriel junto com o "Futuro"; testado no emulador Android 17: "Já apliquei" com o app fechado gravou pela tarefa em segundo plano e confirmou, "Lembrar em 1 h" reagendou e o adiamento sumiu ao registrar, aviso de backup na Hoje; projeção e padrões cobertos pelos testes de unidade)* | Avisos (platô e marcos já vinham da fase 1; projeção da meta; padrões sintomas × dose no Diário); botões "Já apliquei" e "Lembrar em 1 h" no lembrete, também com o app fechado; lembrete de backup (Hoje e notificação) | Os botões funcionam no aparelho dela com o app fechado |
| **Depois do MVP** (antes "Futuro") *(código pronto em 19/11; testado no emulador: migração v2 sobre dados existentes, medidas, foto pela câmera, relatório PDF gerado e compartilhado, Health Connect com permissão e importação (sem balança real), widget adicionado pela confirmação do Android, custos)* | Relatório em PDF para a consulta; medidas corporais; planilhas CSV; fotos de progresso; balança pelo Health Connect; widget de tela inicial; custos | Usados no aparelho dela; o Health Connect testado com a balança real |
| **Homologação** *(APK 1.0.0-rc.1 gerado em 19/11)* | APK candidato à versão final: chave de assinatura própria, sem o botão de dados de exemplo; ela usa no celular dela com os dados de verdade. Correções saem como `1.0.0-rc.2`, `rc.3`… instaladas por cima | Os critérios das fases acima passam no aparelho dela; a aprovada sai como **1.0.0**, com a mesma chave |

## 2. Decisões

**Tomadas (18/11/2026):**
- Só Android; instalação direta pelo APK.
- Canetas Wegovy e Ozivy, com troca de marca a qualquer momento.
- Pesagem livre, sem horário nem lembrete.
- Sem login, conta, senha ou biometria; sem nuvem.
- Banco local enxuto: SQLite com 5 tabelas, sem ORM.
- Nome: **Leve**. Menu flutuante.
- Fase 2 antes da fase 1, a pedido do Gabriel.
- IMC: ela escolhe nos Ajustes entre ocultar, só o número (padrão) e o número com a faixa da OMS.
- Backup restaurado pelo seletor do expo-file-system (sem o expo-document-picker).

**Tomadas na fase 1 (19/11/2026):**
- Onboarding em 5 passos (Você, Seu peso, Seu tratamento, Locais, Lembretes). As aplicações geradas por "Já comecei" entram sem local e sem caneta, com a nota "Importada no início", e são editáveis.
- Lembretes com alarme exato (`USE_EXACT_ALARM`), agendados 4 semanas à frente e refeitos a cada mudança. Reforço configurável de 1 a 8 h, ou sem reforço.
- Registro a menos de 3 dias de outro: o formulário avisa, mas não bloqueia.
- A abertura da caneta segue a primeira aplicação com ela, também ao editar ou excluir (a caneta aberta só por uma aplicação excluída volta ao estoque).
- O registro de aplicação abre em tela cheia; peso, sintomas e nota continuam em sheet.
- Permissões de armazenamento e de sobreposição de tela bloqueadas no manifesto.
- Ícone: curva verde-azulada com ponto violeta sobre lavanda ([02-design.md § 10](02-design.md#10-ícone-do-app)).
- Texto da dose esquecida conferido na bula (EMA e bula brasileira, [01-produto.md § 9](01-produto.md#9-fontes-consultadas-bula-e-mercado)).

**Tomadas na fase 3 e depois do MVP (19/11/2026):**
- Fase 3 e "Futuro" implementados juntos, a pedido do Gabriel ("implemente todas as fases"); um APK só no fim (0.4.0).
- "Já apliquei" grava direto, sem abrir o app, com os valores do formulário, e confirma com outra notificação que leva à edição. Não grava se houver registro a menos de 3 dias.
- Aviso de backup na Hoje acima do "marco próximo" (perder dados pesa mais que um lembrete motivacional).
- Banco com 7 tabelas: `measures` e `photos` novas; preço como coluna da caneta. Backup na versão 2, com as fotos em base64 dentro do JSON (um arquivo só para guardar); o v1 continua entrando.
- Fotos reduzidas para 1280 px, fora da galeria; data da galeria pelo EXIF.
- Widget sem peso, por privacidade.
- Health Connect só leitura; `minSdkVersion` 26 (Android 8.0+).
- Relatório em PDF montado em HTML com o expo-print, sem biblioteca de PDF; planilhas CSV no padrão brasileiro (";" e vírgula decimal).

**Tomadas na homologação (19/11/2026):**
- O APK de homologação já é o candidato à versão final: mesma chave e mesmo pacote da 1.0.0, para os dados dela continuarem de uma versão para a outra.
- Chave própria criada localmente (não no EAS), guardada fora do projeto; o build de release falha sem ela, para nunca sair um APK que não instala por cima ([03-arquitetura.md § 10](03-arquitetura.md#10-build-e-instalação-no-celular-dela)).
- Versões de homologação como `1.0.0-rc.N`.

**Em aberto (o app segue o padrão até alguém decidir):**

| Pergunta | Padrão |
|---|---|
| Ela quer uma meta de peso? | Opcional; sem meta, a Hoje mostra os marcos de % |
| Mostrar a faixa do IMC (sobrepeso, obesidade)? | Só o número; a faixa fica a um toque nos Ajustes |
| Braços entram no rodízio? | Abdômen e coxas; braços opcionais nos Ajustes |
| Validade do Ozivy depois de aberto | 6 semanas, até conferir na bula |

## 3. Riscos

| Risco | Mitigação |
|---|---|
| Lembretes atrasados (economia de bateria do Android) | Testar no aparelho dela; tela de ajuda para tirar o app da otimização |
| Botões do lembrete com o app fechado dependem da tarefa em segundo plano | Testar "Já apliquei" e "Lembrar em 1 h" com o app fechado no aparelho dela; a notificação de confirmação mostra o que foi gravado |
| Balança: cada fabricante sincroniza com o Health Connect de um jeito | Importação com sobreposição de 2 dias e sem duplicar; "Importar agora" nos Ajustes |
| Backup grande com muitas fotos | Fotos reduzidas (≈ 200 KB); uma foto por mês dá ≈ 2,5 MB por ano |
| Widget diferente em cada launcher | Tamanho mínimo 4 × 2, redimensionável; textos curtos com reticências |
| Perda de dados (celular perdido, trocado ou app desinstalado) | Backup em 2 toques e lembrete mensal; nunca desinstalar para atualizar |
| Chave de assinatura perdida | Chave fora do projeto com cópia de segurança do arquivo e da senha (gerenciador de senhas ou nuvem pessoal); se perder, backup, desinstalar e restaurar |
| Novas canetas ou bula diferente | Catálogo editável no cadastro da caneta; nada fixo no banco |
| Texto da bula exibido de forma imprecisa | Conferido em 19/11 na bula da EMA e na brasileira; sempre com "confirme com seu médico" |
