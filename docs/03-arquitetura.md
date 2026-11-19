# Leve — Arquitetura técnica

> v0.5 · 19/11/2026 · Android 8.0 ou mais novo, APK instalado direto, banco local enxuto, sem login. Fases 0 a 3 e os itens de "Futuro" em código.

## 1. Stack (versões instaladas)

| Camada | Escolha | Motivo |
|---|---|---|
| Base | **Expo SDK 58** (React Native 0.88, React 19.3), TypeScript 6 `strict` | build local ou na nuvem, um código só |
| Rotas | **Expo Router 58**, rotas em `src/app/`; abas de `expo-router/js-tabs` | rotas por arquivo, `formSheet` nativo no Android |
| Banco | **expo-sqlite 58**, SQL direto e sem ORM | 5 tabelas pequenas, nada a mais |
| Desenho | **react-native-svg 15** para ícones, gráficos e mapa do corpo | sem biblioteca de ícones nem de gráficos |
| Fonte | @expo-google-fonts/plus-jakarta-sans | |
| Nativos | expo-haptics, expo-splash-screen, expo-system-ui, expo-status-bar | |
| Backup | **expo-file-system** (grava o arquivo e abre o seletor com `File.pickFileAsync`) e **expo-sharing** (menu de compartilhar) | o seletor do expo-file-system dispensa o expo-document-picker |
| Horário | **@react-native-community/datetimepicker** (relógio e calendário nativos do Android, por `DateTimePickerAndroid.open`) | horário da aplicação, data e hora dos registros e início do tratamento |
| Lembretes | **expo-notifications** (canal "Lembretes", gatilho de data, alarme exato, botões) e **expo-task-manager** | lembretes locais; os botões "Já apliquei" e "Lembrar em 1 h" rodam com o app fechado |
| Relatório | **expo-print** (HTML → PDF) | relatório para a consulta, sem biblioteca de PDF |
| Fotos | **expo-image-picker** (câmera e galeria) e **expo-image-manipulator** (reduz para 1280 px) | fotos de progresso leves, na pasta privada do app |
| Balança | **react-native-health-connect** (com o plugin próprio) e **expo-build-properties** (`minSdkVersion` 26) | só leitura do peso pelo Health Connect |
| Widget | **react-native-android-widget** | widget de tela inicial desenhado em JS, com tarefa em segundo plano |
| Testes | `node:test` + **tsx** (só desenvolvimento) | as regras são funções puras; não precisa de Jest |

**Fica de fora:** ORM, gerenciador de estado, biblioteca de formulários, de datas, de gráficos ou de PDF, login, analytics, push. Instale sempre com `npx expo install <pacote>`.

**Entrada:** `index.ts` (na raiz, `"main"` do package.json) registra a tarefa dos botões do lembrete (`src/db/reminderTask.ts`) e a do widget (`registerWidgetTaskHandler`) e só depois carrega o `expo-router/entry`. O Android chama essas tarefas sem a tela aberta.

**Detalhes do SDK 58 que já morderam:**
- `react-dom` fica fixo em **19.3.0** (a versão do SDK). Sem isso, o npm tenta a 19.3.1, que exige outro React, e qualquer instalação falha com `ERESOLVE`. Ele não entra no APK.
- As fontes são importadas por peso (`@expo-google-fonts/plus-jakarta-sans/600SemiBold`): o índice do pacote levaria as 16 variações para o APK.
- `Stack` vem de `expo-router/stack` e `Tabs` de `expo-router/js-tabs`. A barra personalizada recebe `state`, `descriptors`, `emitter` e `navigateToTab`.
- O TypeScript 6 não inclui mais os tipos de `@types` sozinho. Os testes declaram `/// <reference types="node" />`; o código do app não enxerga APIs do Node.
- O lint (`react-hooks/refs`) não aceita ref atualizada durante a renderização. Os gestos dos gráficos usam os eventos de toque da própria View (`onResponderMove`), sem `PanResponder`.
- O tema escolhido nos Ajustes vai para `Appearance.setColorScheme` (`'auto'` volta a seguir o sistema). Ele é aplicado no `onInit` do banco, antes da primeira tela, para não piscar.
- O lint (`react-hooks/set-state-in-effect`) não aceita `setState` dentro de efeito. Valor que depende de outro (a caneta escolhida sozinha quando ela cadastra uma no meio do registro) é calculado na renderização.
- No datetimepicker 9, `onChange` está depreciado: use `onValueChange` (só é chamado quando ela confirma).
- No expo-notifications, `AndroidImportance` vem por import nomeado (o lint não o acha no namespace). O lembrete usa o gatilho `DATE` com `channelId`.
- Botão de notificação com `opensAppToForeground: false` só chega ao JS com o app fechado por uma tarefa do expo-task-manager registrada com `Notifications.registerTaskAsync` no carregamento do app (por isso o `index.ts`).
- O Health Connect exige `minSdkVersion` 26: o APK não instala mais em Android 7.
- `npx expo prebuild -p android` regenera a pasta `android/` inteira neste projeto (sem histórico no git). Nada é editado à mão lá dentro; tudo vem do `app.json` e dos plugins.

## 2. Princípios

- **Local e sem rede.** Nenhuma chamada externa.
- **Banco enxuto:** 5 tabelas, números inteiros, datas em texto local, nada derivado gravado.
- **Regras em funções puras** em `src/domain`, testadas. A UI só exibe e dispara ações.
- **Poucas dependências:** cada pacote novo precisa de motivo.

## 3. Pastas

```
leve/
├─ src/
│  ├─ app/                       # rotas (Expo Router)
│  │  ├─ _layout.tsx             # fontes, splash, tema, banco (migrações), aviso com Desfazer, sheets
│  │  ├─ (tabs)/_layout.tsx      # abas + menu flutuante
│  │  ├─ (tabs)/index.tsx        # Hoje
│  │  ├─ (tabs)/progress.tsx     # Evolução
│  │  ├─ (tabs)/treatment.tsx    # Tratamento
│  │  ├─ (tabs)/journal.tsx      # Diário
│  │  ├─ onboarding.tsx          # primeiros passos (as abas redirecionam para cá até `onboarded`)
│  │  ├─ new.tsx                 # sheet "Novo registro"
│  │  ├─ log/injection.tsx       # aplicação: registrar, editar (?id=) e registrar a atrasada (?day=)
│  │  ├─ log/weight.tsx          # peso: registrar e editar (?id=)
│  │  ├─ log/symptoms.tsx · log/note.tsx       # sintomas; nota (editar com ?id=)
│  │  ├─ log/measures.tsx        # medidas: registrar e editar uma medição (?at=)
│  │  ├─ photos.tsx              # fotos de progresso (antes e agora, grade, tela cheia)
│  │  ├─ settings/index.tsx · profile · schedule · plan · sites · export · health   # Ajustes, relatório e planilhas, balança
│  │  ├─ pens/index.tsx · pens/new.tsx · pens/prices.tsx   # canetas, estoque e preços
│  │  └─ injections.tsx          # histórico completo de aplicações
│  ├─ db/          schema.ts (migrações) · queries.ts · useQuery.ts · hooks.ts · settings.ts · backupFile.ts · seed.ts ·
│  │               reminders.ts (canal, permissão, reagendamento, botões) · reminderTask.ts (botões com o app fechado) ·
│  │               injectionSave.ts (gravar aplicação: formulário e "Já apliquei") · photos.ts · health.ts
│  ├─ domain/      weight · phases · progress · schedule · titration · pens · sites · timeline · backup ·
│  │               injection · onboarding · today · reminders · patterns · measures · costs · health (+ *.test.ts)
│  ├─ widget/      NextWidget.tsx (desenho) · widget.tsx (dados, tarefa do Android, atualização)
│  ├─ ui/          Text · Screen · SubScreen · SheetScreen · Card · CardHeader · Button · IconButton · Chip ·
│  │               SegmentedControl · Toggle · List · Bits · Toast · BodyMap · PenGauge · DoseSteps · MonthCalendar ·
│  │               SymptomForm · StatusBarShade · FloatingTabBar · Icon · charts/(WeightChart · WeeklyBars · PhaseBars) ·
│  │               Phase1Bits (NumericKeypad · WeekStrip · Sparkline · GoalRing · DateTimeRow)
│  ├─ theme/       tokens.ts · ThemeProvider.tsx
│  └─ lib/         format.ts (pt-BR) · dates.ts · labels.ts · csv.ts · report.ts (HTML do PDF) · patternText.ts (+ lib.test.ts)
├─ assets/ · docs/
├─ plugins/       withReleaseSigning.js (assinatura do APK com a chave própria, § 10)
└─ index.ts · app.json · eas.json · tsconfig.json
```

## 4. Banco de dados

Sete tabelas (cinco desde a fase 0, mais `measures` e `photos` na migração 2). Pesos em gramas, doses em microgramas, medidas em milímetros, preços em centavos, datas como texto na hora local (`AAAA-MM-DD HH:MM`, ordena e agrupa por dia sem conversão).

```sql
-- Preferências e perfil, chave → JSON
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Cada caneta comprada; os dados do modelo são copiados do catálogo no cadastro
CREATE TABLE pens (
  id        INTEGER PRIMARY KEY,
  brand     TEXT    NOT NULL,             -- 'Wegovy', 'Ozivy', 'Ozempic', ...
  total_mcg INTEGER NOT NULL,             -- conteúdo (4000 = 4 mg)
  dose_mcg  INTEGER,                      -- dose fixa (Wegovy); NULL = ajustável
  days_open INTEGER NOT NULL DEFAULT 42,  -- validade depois de aberta
  opened_on TEXT,                         -- 'AAAA-MM-DD'; NULL = fechada no estoque
  done      INTEGER NOT NULL DEFAULT 0,   -- 1 = finalizada ou descartada
  price_cents INTEGER                     -- v2: preço pago (custos); NULL = não informado
);

-- Aplicações; dose NULL = semana pulada
CREATE TABLE injections (
  id       INTEGER PRIMARY KEY,
  at       TEXT    NOT NULL,              -- 'AAAA-MM-DD HH:MM'
  dose_mcg INTEGER,
  site     TEXT,                          -- 'AE','AD','CE','CD','BE','BD'
  pen_id   INTEGER REFERENCES pens(id),
  note     TEXT
);

-- Pesagens livres, quantas quiser
CREATE TABLE weights (
  id INTEGER PRIMARY KEY,
  at TEXT    NOT NULL,
  g  INTEGER NOT NULL                     -- 79700 = 79,7 kg
);

-- Diário: sintomas e notas
CREATE TABLE journal (
  id    INTEGER PRIMARY KEY,
  at    TEXT    NOT NULL,
  kind  TEXT    NOT NULL,                 -- 'nausea', 'fatigue', ..., 'other', 'well', 'note'
  level INTEGER,                          -- 1–3 nos sintomas; NULL em 'well' e nas notas
  text  TEXT
);

-- v2: medidas corporais; várias no mesmo `at` formam uma medição
CREATE TABLE measures (
  id   INTEGER PRIMARY KEY,
  at   TEXT    NOT NULL,
  kind TEXT    NOT NULL,                  -- 'waist', 'hip', 'abdomen', 'chest', 'arm', 'thigh'
  mm   INTEGER NOT NULL                   -- 905 = 90,5 cm
);

-- v2: fotos de progresso; o arquivo fica em <documentos do app>/photos/
CREATE TABLE photos (
  id   INTEGER PRIMARY KEY,
  at   TEXT    NOT NULL,
  file TEXT    NOT NULL,                  -- 'p-20261119-0812-k3f9.jpg'
  note TEXT
);

CREATE INDEX injections_at ON injections(at);
CREATE INDEX weights_at    ON weights(at);
CREATE INDEX journal_at    ON journal(at);
CREATE INDEX measures_at   ON measures(at);
CREATE INDEX photos_at     ON photos(at);
```

**`settings`** (tipos e padrões em `src/db/settings.ts`): `profile` (`{ name, heightCm, goalG }`), `schedule` (`{ weekday, time }`, 0 = domingo), `plan` (`[{ mcg, weeks | null }]`), `sites` (`['AE','AD','CE','CD']`), `theme` (`'auto' | 'light' | 'dark'`), `bmi` (`'off' | 'number' | 'band'`), `reminders` (`{ injection, pen, followUpHours, backup }`, padrão `{ true, true, 3, true }`), `health` (`{ enabled, lastSync }`), `lastBackup` e `onboarded`.

**Derivado, nunca gravado:** peso inicial (primeira pesagem), início do tratamento (primeira aplicação), caneta em uso, mg e doses restantes, "usar até", tendência, marcos, número da caneta (ordem de cadastro).

**Migrações:** `PRAGMA user_version`, uma lista de scripts SQL aplicada em ordem no `onInit` do `SQLiteProvider`.

**Reatividade:** o `SQLiteProvider` abre com `enableChangeListener: true`; o hook `useQuery(sql, params, tables)` refaz a consulta quando `addDatabaseChangeListener` avisa mudança numa das tabelas. As telas carregam as tabelas inteiras (`src/db/hooks.ts`): o volume é pequeno.

**Excluir e desfazer:** `takeRows` lê e apaga numa transação; o "Desfazer" devolve as mesmas linhas com `insertRows` (mesmos ids). Caneta citada por aplicação não sai (chave estrangeira).

**Tamanho:** um ano tem cerca de 52 aplicações, 400 pesagens e 100 anotações, menos de 100 KB no banco. As fotos ficam fora do banco, com cerca de 150–300 KB cada (reduzidas para 1280 px).

**Fotos excluídas:** a linha sai na hora (com "Desfazer"); o arquivo sem linha é apagado por `cleanOrphanPhotos` na próxima abertura e depois de restaurar um backup.

**Conexões:** a tarefa dos botões do lembrete e a do widget abrem a sua própria conexão com o `leve.db` (`useNewConnection: true`: por padrão o expo-sqlite reaproveitaria a conexão da tela, e fechá-la no fim da tarefa derrubaria o app). Todas usam `busy_timeout` de 4 s, para quem chega depois esperar em vez de falhar. Como o aviso de mudança do expo-sqlite é por conexão, `useQuery` também recarrega ao voltar para o app. `withTransactionAsync` não é exclusiva: duas transações ao mesmo tempo na mesma conexão falham, por isso a importação da balança roda uma de cada vez.

## 5. Domínio (funções puras, testadas)

```ts
// weight.ts — entra a lista de pesagens, sai tudo o que a Evolução mostra
dailyMeans(weights): { day; g }[]
trend(daily, alpha = 0.15): { day; g; t }[]
trendAt(points, day) · trendAtStart(points, from, to)
slopePerWeek(points) · ratePerWeek(points, endDay, windowDays = 28): number | null   // g/semana
isPlateau(points, today)                          // ritmo de 21 dias abaixo de 0,1 kg/semana
phaseStats(phases, points, { from, to }): PhaseStat[]       // recortado no período
weeklyChanges(points, firstInjectionDay, today): WeekChange[]
treatmentWeek(firstInjectionDay, day)
milestones(startG, goalG, points) · nextMilestone(list, startG, latestG)
bmi(g, heightCm) · bmiBand(value)

// phases.ts — fases de dose tiradas do histórico
dosePhases(injections) · doseOn(phases, day)

// progress.ts — período da Evolução
periodStart(period, today, firstDay) · periodSummary(weighings, points, from, to)

// schedule.ts
nextDue(lastRecordDay, weekday, today): { day; state: 'upcoming' | 'today' | 'taken' | 'overdue'; daysUntil }
plannedDays(next, untilDay)

// fase 1
parseWeight(text) · weighingChange(newG, previousG)   // 30–300 kg, até 2 casas; 'first' | 'down' | 'up' | 'same'
penForDose(pens, doseMcg) · injectionDefaults({ plan, injections, pens, sites }) · doseChoices(plan, extra)
penOutcome(pen, usedBeforeMcg, doseMcg, nextDoseMcg)  // a caneta abre? acaba? quantas doses restam
nearbyRecord(injections, stamp)                       // registro a menos de 3 dias (aviso de repetição)
openingDay(pen, day) · penToClose(pens, removed, others)   // abertura da caneta ao registrar, editar e excluir (R3)
retroactiveInjections(firstDay, phases, time, today) · planForBrand(brand) · dosesForBrand(brand)
weekStrip(today, weighDays, appliedDays, plannedDay) · weekTrendChange(points, today) · recentTrend(points, today, 30)
goalProgress(startG, latestG, goalG) · todayAlert({ buy, milestones, next, plateau, today, tipCount })
reminderPlan({ next, time, followUpHours, now, injection, pen, lastDose, useBy, weeksAhead })

// fase 3 e depois do MVP
goalProjection(points, goalG, today)                 // projeção da meta (R4)
symptomPatterns(journal, injections)                  // padrões do Diário (R6)
backupOverdue(lastBackup, firstRecordDay, today) · backupDueDay(lastBackup, firstRecordDay)
reminderPlan({ …, backupDue }) · hasInjectionActions(kind) · snoozeAt(now, minutes)
parseCm(text) · measureStats(measures) · waistHipRatio(measures)            // R9
costSummary(pens, today) · parseMoney(text)              // R11
importableWeights(records, existing)                                        // R12

// titration.ts · pens.ts · sites.ts · timeline.ts · backup.ts
titrationState(plan, injections)      // etapas, dose atual, semanas nela, sugestão da próxima
penState(pen, usedMcg, nextDoseMcg, today) · penOverview(pens, used, currentMcg, nextDueDay, today)
rotation(injections, enabledSites) · suggestSite(injections, enabledSites)
buildTimeline({ injections, weights, journal, weekChanges, today })
makeBackup(settingsRows, tables, exportedAt) · parseBackup(text) · backupCounts(backup)
```

As fórmulas estão em [01-produto.md § 6](01-produto.md#6-regras-de-negócio). Os testes (`npm test`, 110 casos, em `src/domain` e `src/lib`) cobrem: várias pesagens no mesmo dia, intervalos irregulares, dias sem pesagem, aplicação adiantada e atrasada, troca do dia da semana, semana pulada, dose fora do plano, caneta com resto menor que a dose, estoque que não serve para a dose atual, rodízio sem repetir a última região, backup corrompido ou de versão mais nova, o agrupamento do Diário, o histórico retroativo do onboarding, os valores pré-preenchidos do registro, o aviso de registro repetido, a abertura da caneta ao registrar, editar e excluir, o peso digitado, os avisos da Hoje e o plano de lembretes (atrasada, reforço, véspera da última dose, vencimento, backup), a projeção da meta, os padrões de sintomas, as medidas, os custos, a importação do Health Connect, o backup v1 e v2 (com fotos) e, em `src/lib`, o CSV, o HTML do relatório e os textos dos padrões.

## 6. Notificações

- Só locais (`expo-notifications`), num canal Android "Lembretes" com importância alta e vibração. A permissão é pedida no último passo do onboarding (Android 13+); se ela negar, os Ajustes mostram "Permitir notificações" ou "Abrir configurações do app".
- O que agendar é uma função pura (`reminderPlan`, em `src/domain/reminders.ts`). `rescheduleAll(db)` (`src/db/reminders.ts`) cancela tudo, lê o banco e agenda: (1) a aplicação no dia e hora do plano, nas próximas 4 semanas; (2) o reforço N horas depois (padrão 3), só para a próxima e só se ela não estiver atrasada; (3) a véspera da aplicação que usa a última dose da caneta; (4) 7 dias antes do "usar até" da caneta aberta. O que já passou não entra. O id do lembrete é o tipo mais a data (`injection-2026-11-22`).
- `useReminderSync()` refaz o agendamento ao abrir o app, ao voltar do segundo plano e 0,8 s depois de qualquer mudança em `injections`, `pens` ou `settings`. Registrar a aplicação já tira o reforço do dia, porque a próxima data muda.
- `useReminderTaps()` leva o toque no lembrete para `data.url` (`/log/injection`, `/treatment` ou `/settings`), também com o app fechado.
- **Botões** (categoria `aplicacao`, só nos lembretes da aplicação e do reforço): "Já apliquei" e "Lembrar em 1 h", ambos com `opensAppToForeground: false`. `handleReminderAction(db, response)` trata os dois: com o app aberto, pelo listener de respostas; com o app em segundo plano ou fechado, pela tarefa `leve-lembrete-acoes` (`src/db/reminderTask.ts`, que abre a própria conexão com o banco). Uma resposta entregue duas vezes é ignorada.
  - "Já apliquei" chama `saveFromDefaults` (`src/db/injectionSave.ts`, o mesmo caminho do formulário: abre a caneta, grava, finaliza a caneta que acabou), confirma com a notificação "Aplicação registrada" (toque → `/log/injection?id=`) e reagenda tudo. Com registro a menos de 3 dias, não grava e avisa "Aplicação já registrada".
  - "Lembrar em 1 h" agenda uma cópia do lembrete (`snooze-<id>`), com os mesmos botões. `rescheduleAll` mantém o `snooze-*` enquanto a aplicação estiver pendente (hoje ou atrasada) e o cancela quando ela é registrada.
- **Backup:** um lembrete no dia em que faz 30 dias do último backup (ou do primeiro registro), no horário da aplicação, com toque → Ajustes.
- **Alarme exato:** o `app.json` declara `USE_EXACT_ALARM` e `SCHEDULE_EXACT_ALARM`, para o lembrete sair na hora mesmo com o celular parado. Lembrete de medicação é um dos usos que o Android prevê para o `USE_EXACT_ALARM`.
- **Permissões bloqueadas:** `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` e `SYSTEM_ALERT_WINDOW` ficam fora do manifesto (`blockedPermissions`); o backup usa o seletor de arquivos e o menu de compartilhar.
- Testado no emulador: o lembrete ficou agendado como alarme exato, disparou na hora com o ícone e o canal certos, e o toque abriu o registro da aplicação. Falta testar no aparelho dela: a economia de bateria de alguns fabricantes atrasa alarmes; os Ajustes têm "Se os lembretes atrasarem", com o passo a passo para tirar o Leve da otimização.

## 7. Backup

- **Exportar (versão 2):** `{ app: 'leve', version: 2, exportedAt, settings, pens, injections, weights, journal, measures, photos }`, com os ajustes como objetos e cada foto com a imagem em base64 (`data`), gravado no cache como `leve-backup-AAAA-MM-DD.json` e entregue ao menu de compartilhar do Android. Ao voltar do menu, grava `lastBackup`.
- **Compatível com a versão 1:** um backup antigo entra sem medidas e sem fotos, com `price_cents` nulo. O nome de arquivo da foto é validado (`p-…jpg`, sem caminho) antes de gravar.
- **Restaurar:** seletor de arquivo (`File.pickFileAsync`, qualquer tipo, porque o WhatsApp e o Drive às vezes perdem o tipo) → validação (`parseBackup`: app, versão, campos e tipos de cada linha, ids únicos, caneta citada existe) → confirmação com o resumo ("48 pesagens, 13 aplicações…") → substitui tudo numa transação. Se algo falhar, nada muda.

## 8. Privacidade

Sem rede, sem conta, sem analytics. Os dados ficam no armazenamento do app; o backup é um arquivo que só ela controla.

- **Fotos:** só na pasta privada do app, fora da galeria; a galeria é aberta pelo seletor do sistema, sem permissão de leitura de mídia (as permissões `READ_MEDIA_*` e `RECORD_AUDIO` ficam bloqueadas no manifesto). A câmera pede permissão na primeira foto.
- **Health Connect:** só leitura do peso; ela pode tirar a permissão no próprio Health Connect.
- **Widget:** não mostra peso, só a próxima aplicação e a caneta.
- A permissão `INTERNET` continua no manifesto (vem do React Native e serve ao desenvolvimento); o app não faz chamadas de rede.

## 9. Qualidade

- `npx tsc --noEmit`, `npx expo lint` e `npm test` antes de cada entrega.
- Testes do domínio em `src/domain/*.test.ts`, rodando com `node:test` e `tsx`.
- Dados de demonstração (12 semanas, os mesmos do protótipo) num botão que só aparece em desenvolvimento e nos APKs de teste (`EXPO_PUBLIC_DEMO=1`).

## 10. Build e instalação no celular dela

- **Desenvolvimento:** `npx expo run:android` com o celular na depuração USB ou um emulador (versão de desenvolvimento ligada ao Metro). O Expo Go não serve: o app usa módulos nativos que ele não tem (Health Connect, widget, tarefas em segundo plano).
- **APK (caminho escolhido: build local):** `npx expo prebuild -p android` e, em `android/`, `gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a` (comandos completos no README). Usa o JDK 21 e o SDK do Android Studio da máquina. O primeiro build levou 20 min; os seguintes usam cache.
- **Versão:** `version` e `android.versionCode` no `app.json` sobem a cada APK entregue (0.2.0 / 2 na fase 2; 0.3.0 / 3 na fase 1; 0.4.0 / 4 na fase 3 e nos itens de "Futuro"; 1.0.0-rc.1 / 5 na homologação). A homologação usa `1.0.0-rc.N`; a aprovada sai como `1.0.0`, com a mesma chave.
- **Android mínimo:** 8.0 (`minSdkVersion` 26, exigência do Health Connect). O Health Connect vem no Android 14 ou mais novo; antes disso, é um app da Play Store.
- **Assinatura (desde a 1.0.0-rc.1):** chave própria do Leve (RSA 4096, alias `leve`, válida por 27 anos), criada em 19/11/2026 e guardada **fora do projeto**: o arquivo em `%USERPROFILE%\.leve\leve-release.jks` e as senhas no `%USERPROFILE%\.gradle\gradle.properties` (`LEVE_RELEASE_STORE_FILE`, `LEVE_RELEASE_STORE_PASSWORD`, `LEVE_RELEASE_KEY_ALIAS`, `LEVE_RELEASE_KEY_PASSWORD`). O config plugin `plugins/withReleaseSigning.js` liga a chave ao `android/app/build.gradle` a cada prebuild (a pasta `android/` é regenerada). Sem as propriedades, o build de release para de propósito: um APK com outra chave não instala por cima do app dela, e desinstalar para instalar apagaria os dados.
  - Impressão digital SHA-256 do certificado: `FB:39:C5:72:1B:6D:3E:B3:C1:C4:A0:8E:E9:22:F1:B4:F4:39:57:8C:E6:00:B3:2D:FD:16:F0:B5:83:6B:6B:A5` (confira um APK com `apksigner verify --print-certs`, que mostra o mesmo valor sem os dois-pontos).
  - **Guarde cópia do arquivo e da senha** (gerenciador de senhas ou nuvem pessoal). Sem eles, nenhuma atualização instala por cima; sobra o caminho do backup: exportar, desinstalar, instalar e restaurar.
  - Nunca crie outra chave.
- **APK de homologação e de uso real:** gerado sem `EXPO_PUBLIC_DEMO`, então sem o botão de dados de exemplo.
- **APK de teste:** gerado com `EXPO_PUBLIC_DEMO=1`, mostra o botão de dados de exemplo. Os de teste até a 0.4.0 usavam a chave de debug padrão do Android: para passar de um deles para a homologação, desinstale uma vez (antes, exporte o backup se houver dados de verdade).
- **Atualizar:** gere um novo APK e instale por cima. Com o mesmo `android.package` (`com.leve.tratamento`) e a mesma chave, **os dados continuam lá**.
- **Nunca desinstale** para atualizar: desinstalar apaga o banco. Antes de qualquer troca de celular ou reinstalação, exporte o backup.
- **Alternativa na nuvem:** perfil `apk` no `eas.json` e `npx eas-cli@latest build -p android --profile apk`. Antes, suba esta mesma chave com `npx eas-cli@latest credentials`; senão o EAS cria outra, e o APK dele não instala por cima.
