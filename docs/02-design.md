# Leve — Design

> Protótipo navegável (link privado): [Leve · Design do app](https://claude.ai/artifact/QaoSuzuubpS1aGiwurWeBb). Telas em 390 × 844 pt; as telas longas aparecem inteiras, como captura de rolagem.

## 1. Conceito: "Sereno"

Calmo, leve e confiante. O fundo é lavanda-acinzentado bem claro, os cartões são brancos e há uma família tipográfica sans só, com números grandes em peso leve. Duas cores carregam significado:

- **Violeta = medicação** (aplicação, caneta, dose).
- **Verde-azulado = corpo** (peso, progresso, queda).
- **Âmbar** só para atenção e aumento de peso. Nunca vermelho para o peso.

Nada clínico (sem azul-hospital), nada infantil, sem rosa-clichê. Muito respiro, poucos elementos por tela e sempre uma ação principal clara.

## 2. Tokens

Todos os valores ficam em `src/theme/tokens.ts`. Nenhum componente usa cor ou tamanho solto.

### 2.1 Cores

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F4F3F8` | `#121118` | fundo das telas |
| `surface` | `#FFFFFF` | `#1C1A25` | cartões, sheets, tab bar |
| `surface2` | `#EEEDF4` | `#262332` | chips, teclas, campos, trilhos |
| `line` | `#E4E2EC` | `#312D40` | divisórias e grade de gráficos (hairline) |
| `ink` | `#1C1A29` | `#F2F0F8` | texto principal, botão primário |
| `text2` | `#4E4A60` | `#C4C0D4` | texto secundário |
| `text3` | `#6B6780` | `#9D98B0` | legendas e rótulos pequenos (≥ 4,5:1) |
| `med` | `#6A55D8` | `#9180EC` | medicação: marcas, ícones, botão de aplicação |
| `medStrong` | `#4B37B8` | `#B6A8F6` | texto sobre `medSoft` |
| `medSoft` | `#EFECFC` | `#2A2547` | fundos de medicação |
| `body` | `#00897B` | `#2AA88E` | peso: linha de tendência, anel da meta, barras de queda |
| `bodyStrong` | `#00695E` | `#2AA88E` | texto de peso e queda |
| `bodySoft` | `#E2F3F0` | `#15302C` | fundos de peso |
| `warn` | `#A0610A` | `#C7852F` | atenção e aumento de peso (marcas e texto) |
| `warnStrong` | `#8A5208` | `#C7852F` | texto sobre `warnSoft` |
| `warnSoft` | `#FAF0DE` | `#34281A` | fundos de atenção |
| `danger` | `#B3372F` | `#E5736A` | só ações destrutivas ("Apagar dados") |
| `point` | `#8A86A0` | `#7D7894` | pontos de pesagem nos gráficos |
| `track` | `#C9C6D6` | `#4A4560` | interruptor desligado, linha do zero |
| `figure` · `figureMark` | `#E7E5EF` · `#B9B5C9` | `#2C2939` · `#5A5570` | silhueta do mapa do corpo e marcas apagadas dele |
| `segment` | `#FFFFFF` | `#3A3550` | opção escolhida no controle segmentado |
| `tipBg` · `tipText` · `tipText2` | `#1C1A29` · `#FFFFFF` · `#C4C0D4` | `#F2F0F8` · `#121118` · `#4E4A60` | balão dos gráficos e aviso com "Desfazer" |

**Escala de dose** (ordinal, uma cor por etapa do plano, da primeira à última):

| | Etapa 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Claro | `#B4A7F2` | `#9886EA` | `#7B67E0` | `#5F49CF` | `#4632B0` |
| Escuro | `#56499E` | `#6857C0` | `#7C6ADB` | `#9886EC` | `#B6A8F6` |

**Rodízio no mapa do corpo:** o local sugerido usa `med`; os outros, do que descansou mais para o usado por último, vão de `#B4A7F2` a `#EAE6FB` no claro e de `#6857C0` a `#332C5E` no escuro (`siteShades`). Local fora do rodízio aparece tracejado.

Validação (script de paleta do skill de dataviz): `body` × `warn` × `med` passam em faixa de luminosidade, croma, separação para daltonismo (ΔE ≥ 10) e contraste ≥ 3:1, no claro e no escuro. As escalas de dose passam no teste ordinal (luminosidade monotônica, passos ≥ 0,06, extremo claro ≥ 2:1). Texto pequeno usa sempre `text3` ou mais escuro. `body` (#00897B) **não** serve para texto pequeno no claro (4,3:1); nesse caso use `bodyStrong`.

### 2.2 Tipografia

Família única: **Plus Jakarta Sans** (`@expo-google-fonts/plus-jakarta-sans`), pesos 300 a 700.

| Estilo | Tamanho/linha | Peso | Espaçamento | Uso |
|---|---|---|---|---|
| `display` | 56/60 | 300 | −1,5 | peso em destaque |
| `number` | 36/40 | 300 | −1 | números de cartões |
| `title1` | 28/34 | 600 | −0,5 | título de tela |
| `title2` | 20/26 | 600 | −0,2 | título de sheet |
| `headline` | 16/22 | 600 | 0 | títulos de cartão, botões |
| `body` | 15/22 | 400 | 0 | texto |
| `label` | 13/18 | 500 | 0 | rótulos, chips |
| `caption` | 12/16 | 500 | 0 | legendas, eixos |
| `overline` | 11/14 | 700 | +0,8, caixa alta | sobretítulo de cartão |

- Números em destaque usam algarismos **proporcionais**. Algarismos tabulares (`fontVariant: ['tabular-nums']`) só em listas e eixos, onde os números se alinham.
- Dynamic Type até 1,4× (o `display` limita em 1,2×).

### 2.3 Espaço, raios e sombra

- Grade de 4 pt: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40. Margem lateral de 20, padding de cartão de 20 e 12 entre cartões.
- Raios: chip e botão 999 (pílula) · campo 14 · tecla 18 · cartão 24 · sheet 28 (só no topo).
- Sombra de cartão no claro: `0 1 2 rgba(28,26,41,.04)` + `0 8 24 rgba(28,26,41,.06)`. No escuro não há sombra; a separação vem da superfície.
- Alvos de toque com 44 pt ou mais.

### 2.4 Ícones

Conjunto próprio em SVG (`react-native-svg`), o mesmo do protótipo: traço de 1,75 com 24 pt, e traço de 2 no item ativo do menu. Sem biblioteca de ícones. O ícone da **caneta aplicadora** é desenho próprio; seringa passa a ideia errada.

### 2.5 Movimento e háptica

- Transições de 200–280 ms com *ease-out*; sheets com a mola nativa.
- Números contam até o novo valor em 300 ms.
- Háptica: *selection* ao trocar chip, local ou tecla; *success* ao salvar; *warning* ao excluir.
- Com "Reduzir movimento" ligado: sem contagem, sem animação de marco.

## 3. Navegação

**Menu flutuante** (uma pílula solta da borda) com cinco posições: Hoje · Evolução · ( + ) · Tratamento · Diário.

- **Posição:** 16 pt das laterais e 8 pt acima da área segura inferior (no protótipo, 24 pt da borda). Altura de 68 pt, cantos totalmente arredondados.
- **Material:** fundo quase opaco, sem desfoque, para manter o app leve no Android. No claro, `rgba(255,255,255,0.96)` com borda `line` e sombra `0 12 32 rgba(28,26,41,.16)` (`boxShadow` do RN); no escuro, `rgba(28,26,37,0.96)` com borda `line` e sombra mais forte. O conteúdo rola por baixo, e as telas reservam 112 pt livres no fim.
- **Itens:** o ativo ganha uma cápsula `surface2` atrás do ícone e do rótulo, em `ink`; os inativos ficam em `text3`. Cada item tem 54 pt de altura.
- **( + ):** círculo `ink` de 54 pt dentro da pílula. Abre a folha "Novo registro" (Aplicação · Peso · Sintomas · Nota · Medidas · Foto), cada bloco com uma dica do que vem pré-preenchido ("1 mg · Abdômen D sugerido", "último: 79,7 kg, ontem", "cintura: 94,1 cm, há 3 dias").
- O menu some com o teclado aberto e não aparece nos registros (sheets). Ajustes ficam no botão do topo da Hoje (e no lápis do Tratamento) e abrem como tela empilhada, com voltar.
- Excluir: tocar numa linha do histórico pede confirmação; depois um aviso escuro acima do menu oferece "Desfazer" por 5 s.
- Peso, sintomas e nota abrem como sheet nativo (`formSheet`); a aplicação, mais longa, abre em tela cheia vinda de baixo. Todos voltam para onde ela estava.
- Tocar num registro (histórico do Tratamento, lista de aplicações, Diário, registros da Evolução) abre o mesmo formulário em modo de edição, com "Excluir" no fim.

## 4. Telas

| Tela | Objetivo | Estrutura | Estados |
|---|---|---|---|
| **Boas-vindas** | Apresentar o app e passar confiança | Marca, ilustração, 3 benefícios, "Começar", "Já tenho um backup", aviso médico | — |
| **Primeiros passos** (5 passos) | Configurar em poucos minutos | Você · Seu peso · **Seu tratamento** (cartões de caneta Wegovy, Ozivy e outra; chips de dose; dias da semana; horário; "Já comecei o tratamento" com a data e as semanas de cada fase) · Locais (mapa e chips) · Lembretes | já começou / começando agora; lembretes permitidos ou "Agora não" |
| **Hoje** | Responder "o que faço hoje?" | Saudação · faixa da semana · Próxima aplicação · Peso · Meta e Caneta · aviso | aplicação: em N dias / hoje / aplicada / não registrada; sem pesagem; sem meta |
| **Novo registro** | Escolher o que registrar | Folha com 4 blocos e "Nota livre" | — |
| **Aplicação** | Registrar em segundos | Data e hora, chips de dose, mapa do corpo e chips de local, caneta, sintomas, observação, "Confirmar" e "Pulei esta semana" | dose fora do plano; sugestão da próxima etapa; registro a menos de 3 dias; caneta que abre ou acaba; sem caneta; sucesso; edição |
| **Peso** | Registrar quando quiser, em segundos | Valor grande com ±0,1, variação desde a última pesagem, teclado próprio, "Salvar" | queda / aumento (com frase acolhedora) / igual / fora da faixa; sucesso |
| **Evolução** | Ver a evolução de verdade | Peso atual · filtro de período · gráfico com faixas de dose · resumo do período · por fase · semana a semana · marcos | período sem dados; 1 pesagem só; platô |
| **Tratamento** | Controlar plano e canetas | Plano de doses · caneta em uso e estoque · calendário · rodízio · histórico | caneta acabando; sem estoque; caneta vencendo |
| **Diário** | Contar a história do tratamento | "Como você está hoje?" · "Padrões nos seus registros" · linha do tempo por semana | vazio (primeira semana); sem padrão |
| **Ajustes** | Configurar e cuidar dos dados | Perfil · tratamento e canetas · lembretes (aplicação, caneta, backup, reforço) · widget · aparência · exibição (IMC) · dados (backup, relatório, planilhas, balança) · sobre | sem permissão de notificação |
| **Medidas** (sheet) | Medir em segundos | Data e hora, um campo por medida com a última como referência e onde passar a fita, "Salvar medidas" | edição de uma medição; valor fora da faixa |
| **Fotos** | Ver a mudança que a balança não mostra | "Antes e agora" · grade 3 × N · foto em tela cheia (fundo preto) com data e peso, "Comparar com a primeira" e excluir | sem fotos; uma foto só |
| **Relatório e planilhas** | Levar à consulta, guardar | Período (1M · 3M · 6M · Tudo), "Incluir as notas", "Compartilhar PDF", "Imprimir", planilhas CSV | — |
| **Balança** | Ligar o Health Connect | Explicação, "Conectar a balança", importar ao abrir, "Importar agora", abrir o Health Connect | indisponível; precisa atualizar; sem permissão |
| **Preços das canetas** | Informar o que pagou | Um campo por caneta, "Salvar preços" | — |

Estados vazios: uma frase e uma ação ("Registre seu peso para ver a evolução" + botão). Nada de ilustração genérica.

## 5. Componentes

`FloatingTabBar` (menu flutuante com o +), `Card`, `StatTile`, `Tag` (queda / aumento / igual), `Pill`, `InfoNote` (neutro, medicação, corpo, atenção), `Button` (primário *ink*, *med*, suave, fantasma), `Chip` (selecionável), `SegmentedControl`, `Toggle`, `Stepper`, `TextField`, `SheetScreen`, `NumericKeypad`, `DateTimeRow` (data e hora com o calendário e o relógio do Android), `BodyMap` (mapa e chips de local espelhados), `PenGauge` (segmentos de doses), `DoseSteps` (linha do tempo do plano), `WeekStrip`, `MonthCalendar`, `ListRow`, `Toast` (com Desfazer), os gráficos `WeightChart`, `Sparkline`, `PhaseBars`, `WeeklyBars` e `GoalRing`, e o widget `NextWidget` (desenhado com os componentes do react-native-android-widget, fora do React Native).

Ícones novos, no mesmo traço: `ruler` (medidas), `camera` e `image` (fotos), `file` (relatório), `wallet` (custos) e `activity` (balança e padrões).

## 6. Gráficos

- **Peso:** pesagens como pontos de 7 pt com anel de 1,5 pt da cor da superfície; tendência como linha de 2 pt em `body`; faixas de fundo por dose (escala de dose a ~16% de opacidade) com rótulo direto no topo; grade horizontal em hairline sólida (nunca tracejada); eixo Y à direita com 3 ou 4 valores. A meta, tracejada, só aparece se estiver na faixa visível. Legenda curta: "● pesagens — tendência". O último ponto ganha destaque e rótulo.
- **Interação:** tocar e arrastar mostra uma linha vertical e um balão (data, pesagem, tendência, dose), com háptica de seleção a cada ponto.
- **Por fase:** barras horizontais na cor da etapa, com o valor no fim da barra em `ink`.
- **Semana a semana:** barras divergentes a partir do zero (queda em `body` para baixo, aumento em `warn` para cima), 2 pt de espaço entre barras, ponta arredondada de 4 pt. A semana em andamento fica mais clara.
- **Minigráfico (Hoje):** só a tendência de 30 dias e o ponto final.
- **Anel da meta:** `body` sobre trilho `surface2`.
- **Acessibilidade:** um único filtro de período no topo vale para todos os gráficos da tela. Cada gráfico tem rótulo de leitor de tela com o resumo ("Peso caiu de 86,4 para 79,7 kg desde 23 de agosto") e uma lista equivalente ("Ver registros").

## 7. Tom de voz

Segunda pessoa, frases curtas, acolhedor e direto. Fala de dados, não de julgamento.

| Situação | Diga | Evite |
|---|---|---|
| Peso subiu | "Subiu 0,3 kg desde ontem. Oscilações são normais; sua tendência segue em queda." | "Você engordou" |
| Aplicação esquecida | "A aplicação de domingo não foi registrada. Você aplicou?" | "Você esqueceu a dose!" |
| Platô | "Seu peso está estável há 3 semanas. Platôs são comuns no tratamento." | "Você parou de emagrecer" |
| Marco | "Você chegou a −5%. Cada passo conta." | "Parabéns!!! 🎉🎉" |
| Dose | "Pelo seu plano, a próxima seria 1 mg. Confirme com seu médico." | "Aumente sua dose para 1 mg" |

Formatos: "79,7 kg" · "−0,7 kg" · "−7,8%" · "0,5 mg" · "dom., 22/11" · "em 4 dias" · "há 3 semanas".

## 8. Acessibilidade

- Contraste AA em todo texto, inclusive legendas de 11–12 pt.
- Cor nunca é o único sinal: seta, sinal (+/−) e texto acompanham.
- O mapa do corpo é visual; os controles reais são chips "Abdômen E/D, Coxa E/D, Braço E/D", que o leitor de tela anuncia.
- Rótulos em todos os botões de ícone. Ordem de foco lógica nos sheets.
- Dynamic Type e "Reduzir movimento" respeitados.

## 9. Modo escuro

Segue o sistema por padrão, com escolha manual nos Ajustes. A paleta escura é própria e validada contra a superfície escura; não é inversão automática.

## 10. Ícone do app

Uma curva descendente suave em verde-azulado (`#00897B`) terminando num ponto violeta (`#6A55D8`), sobre lavanda (`#EFECFC`): "tratamento (violeta) que leva o corpo (verde) para baixo, com leveza". Simples o bastante para 29 pt.

- `assets/icon.png` (1024 px), ícone adaptativo do Android (`android-icon-foreground.png` dentro da zona segura, `android-icon-background.png` lavanda e `android-icon-monochrome.png` para os ícones temáticos) e `splash-icon.png`.
- `notification-icon.png`: a mesma curva em branco sobre transparente (96 px), como o Android exige; o violeta entra como cor de destaque da notificação.

## 11. Widget, relatório e fotos

- **Widget (4 × 2):** cartão `surface` com cantos de 24; sobretítulo em caixa alta (`text3`; `warnStrong` quando não registrada), data grande em `ink` (Plus Jakarta Sans 600, 22), linha de dose e local em `text2`, pílula `medSoft` com a caneta e, quando cabe, o botão `med` "Registrar". Versões clara e escura com os mesmos tokens; as fontes vão junto no APK. Tocar no widget abre o app. Prévia em `assets/widget-preview.png`.
- **Relatório (PDF):** A4 com margens de 14 mm, fonte do sistema (o PDF não depende de rede), título com a marca em violeta, pares rótulo/valor em duas colunas, tabelas com divisórias `line` e o mesmo gráfico da Evolução (pontos `point`, tendência `body`, faixas na escala de dose, meta tracejada). Seções não quebram no meio quando cabem na página.
- **Fotos:** miniaturas 3:4 com cantos de 14; a foto aberta usa fundo preto nos dois temas (`viewer` em tokens.ts), para a cor da pele e da roupa ficar fiel.
