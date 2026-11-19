# Leve — Produto

> Especificação v0.5 · 19/11/2026 · decisões confirmadas: Android, Wegovy e Ozivy, pesagem livre, sem login, só o controle. Fases 0 a 3 e os itens de "Futuro" implementados.

## 1. Visão

Um app pessoal, bonito e privado para acompanhar o tratamento com canetas de semaglutida e a evolução do peso. Registrar leva segundos, a evolução se entende num relance e nada sai do celular. Só Android, instalado direto pelo APK, sem conta e sem login.

## 2. Para quem

- **Usuária:** uma pessoa só, com Android, não técnica. Usa **Wegovy e Ozivy**, alternando a marca conforme a compra. Aplicação semanal.
- **Momentos de uso:** a aplicação semanal (em casa, num dia fixo), a pesagem **quando ela quiser** e as consultas com médico(a) e nutricionista.

## 3. Problemas que o app resolve

| # | Dor | Como o Leve resolve |
|---|-----|---------------------|
| 1 | "Já apliquei esta semana? Quando é a próxima?" | Cartão da próxima aplicação com contagem regressiva, lembrete e estados *aplicada* e *não registrada*. |
| 2 | "Onde apliquei da última vez?" | Mapa do corpo com rodízio automático e sugestão do próximo local. |
| 3 | "Quanto ainda tem na caneta? Preciso comprar?" | Doses restantes, validade depois de aberta (6 semanas), estoque com marcas misturadas e aviso de compra. |
| 4 | "Engordei 400 g de ontem pra hoje?!" | Linha de tendência que filtra a oscilação, com linguagem acolhedora. |
| 5 | "Quanto perdi em cada dose?" | Evolução por fase de dose e semana a semana. |

## 4. Princípios

1. **Registro em segundos.** A ação principal fica a um toque e tudo vem pré-preenchido: dose do plano, local sugerido, caneta em uso, último peso.
2. **Tendência acima do ruído.** O peso oscila. O app destaca a tendência e explica a oscilação.
3. **Sem culpa.** Nada de vermelho para aumento de peso nem de "você falhou". O tom é acolhedor.
4. **Privado e sem conta.** Sem login, senha, biometria, servidor ou analytics. O backup é um arquivo na mão dela.
5. **Registra, não prescreve.** O app não recomenda dose nem muda dose sozinho. Ele segue o plano que ela cadastrar a partir da prescrição.
6. **Só o controle.** Cada tela ajuda a registrar ou a acompanhar. O que não ajuda fica de fora.
7. **Leve por dentro.** Banco local pequeno e direto, poucas dependências.

## 5. Escopo por prioridade

**P0** = MVP, a primeira versão instalada no celular dela. **P1** = logo em seguida. **Futuro** = se fizer falta.

### 5.1 Primeiros passos — P0
- Fluxo em 5 passos, com a barra "N de 5" e o voltar do Android voltando um passo: Boas-vindas → **Você** (como prefere ser chamada, altura) → **Seu peso** (atual, que vira a primeira pesagem, e meta opcional) → **Seu tratamento** (caneta que usa agora: Wegovy, Ozivy ou outra; dose atual; dia da semana e horário; **Já comecei o tratamento**, com a data da primeira aplicação e as semanas de cada fase) → **Locais** que costuma usar (padrão: abdômen e coxas; braços opcionais) → **Lembretes** (pede a permissão de notificação; "Agora não" segue sem lembretes) → Hoje.
- O plano de doses vem do modelo da marca (Wegovy ou Ozivy; "Outra" usa o do Ozempic) e fica editável nos Ajustes.
- "Já comecei" gera uma aplicação por semana, da primeira data até a última antes de hoje, com a dose de cada fase, sem local, sem caneta e com a nota "Importada no início". Tudo editável depois (H6).
- "Já tenho um backup" na boas-vindas restaura o arquivo e pula os passos.
- Aviso de que o app não substitui orientação médica.

### 5.2 Hoje — P0
- Saudação, data e uma faixa da semana (seg–dom) com o dia da aplicação e as pesagens marcados.
- Cartão **Próxima aplicação** com quatro estados: *em N dias*, *hoje*, *aplicada* e *não registrada*.
- Cartão **Peso**: última pesagem, variação na semana, total desde o início e minigráfico de 30 dias.
- **Meta** (anel de progresso) e **Caneta** (doses restantes, marca) lado a lado.
- Um aviso por vez, nesta prioridade: caneta acabando sem estoque > marco próximo ou atingido > platô > dica.

### 5.3 Registrar aplicação — P0
- Campos: data e hora (padrão: agora), dose (chips; padrão: a do plano ou a dose fixa da caneta), local (mapa do corpo com a sugestão em destaque), caneta (padrão: a que está em uso, com a marca), como está se sentindo (sintomas opcionais) e observação.
- A caneta escolhida sozinha é a que entrega a dose: a aberta e, sem ela, a mais antiga do estoque. Uma caneta cadastrada com o formulário aberto já entra escolhida. Tocar de novo tira a caneta.
- Se houver outro registro (aplicação ou semana pulada) a menos de 3 dias da data escolhida, o formulário avisa ("Já há uma aplicação de 1 mg registrada hoje às 08:12"). Só avisa; não impede.
- Ações: **Confirmar aplicação** e **Pulei esta semana**. Depois de confirmar, uma tela de sucesso mostra a próxima data, as doses que restam na caneta e "Desfazer".
- O mesmo formulário edita e exclui uma aplicação (a partir do histórico, do Diário ou do Tratamento).

### 5.4 Registrar peso — P0
- **Quantas vezes ela quiser, a qualquer hora.** Não há horário nem lembrete de pesagem.
- Teclado numérico próprio, com vírgula. O valor inicial é a última pesagem; botões −0,1/+0,1; a variação desde a última pesagem aparece ao vivo.
- Depois de salvar: a variação na semana (tendência), o total desde o início, "Concluir" e "Desfazer". O mesmo sheet edita e exclui uma pesagem.

### 5.5 Evolução — P0 (projeção P1)
- Um único filtro de período no topo (1M · 3M · 6M · Tudo) vale para todos os gráficos da tela.
- **Gráfico de peso:** pesagens (pontos), tendência (linha) e faixas de fundo com a dose de cada fase. Tocar e arrastar mostra data e valores.
- **Resumo:** tendência no período, ritmo (kg/semana), menor peso, quantidade de pesagens e IMC.
- **Por fase de dose:** quanto variou em cada dose e em que ritmo.
- **Semana a semana:** barras de queda e de aumento.
- **Marcos:** −5%, −10%, −15%… e a meta, com a projeção da meta (R4).
- **Medidas:** a primeira e a última de cada medida, a variação e a relação cintura/quadril (R9).
- **Fotos:** as mais recentes, com atalho para a tela de fotos (antes e agora, grade, foto em tela cheia e comparação com a primeira) (R10).
- Todo gráfico tem a lista equivalente ("Ver registros").

### 5.6 Tratamento — P0
Plano de doses (etapas com status), caneta em uso (marca, doses restantes, data de abertura, "usar até"), estoque (pode misturar Wegovy e Ozivy), custos (R11), calendário do mês, rodízio de locais e histórico de aplicações (editar e excluir).

### 5.7 Diário — P0 básico, P1 padrões
- Linha do tempo única, agrupada por semana de tratamento: aplicações, sintomas, notas e a pesagem mais recente da semana (com quantas houve e se é a menor até então). O cabeçalho da semana traz a dose e a variação da tendência.
- Registro rápido de sintomas com intensidade e notas livres.
- **Padrões nos seus registros** (P1, implementado): frases como "Náusea costuma aparecer 1 a 2 dias depois da aplicação (4 de 5 registros)" ou "Náusea apareceu mais nas semanas em que a dose subiu". Regra em R6. Só descreve os registros; o texto lembra de falar com o médico se o sintoma incomodar.

### 5.8 Lembretes — P0
- Aplicação: no dia e hora do plano, já agendada para as próximas 4 semanas, mais um reforço se ela não registrar (padrão 3 h depois; de 1 a 8 h, ou sem reforço, nos Ajustes). Uma aplicação atrasada não gera lembrete para trás: o próximo cai no dia habitual.
- Caneta: na véspera da aplicação que usa a última dose (com "Hora de comprar a próxima" se o estoque estiver vazio) e 7 dias antes do "usar até" da caneta aberta.
- Tocar no lembrete abre o registro da aplicação (ou o Tratamento, nos avisos da caneta).
- Os lembretes são refeitos ao abrir o app, ao voltar para ele e a cada registro ou ajuste. Sem permissão de notificação, os Ajustes mostram como ativá-la.
- **Botões no lembrete da aplicação** (P1, implementado), que funcionam com o app fechado:
  - **Já apliquei** grava a aplicação agora, com os valores do formulário (dose atual do plano, local sugerido, caneta que entrega a dose), e mostra outra notificação com o que gravou; tocar nela abre a aplicação para conferir, editar ou excluir. Se já houver registro a menos de 3 dias, não grava de novo e avisa.
  - **Lembrar em 1 h** repete o lembrete uma hora depois. Ele some sozinho se a aplicação for registrada antes.
- **Backup** (P1, implementado): um lembrete no dia em que faz 30 dias do último backup (liga e desliga nos Ajustes).

### 5.9 Dados — P0
- Exportar backup (um arquivo JSON, com as fotos dentro) pelo menu de compartilhar do Android: Drive, WhatsApp, Arquivos.
- Restaurar backup e apagar tudo.
- **Lembrete de backup** (P1, implementado): com 30 dias ou mais desde o último backup (ou, sem nenhum, desde o primeiro registro), a Hoje mostra "Último backup há 32 dias" com o botão "Fazer backup agora", e sai uma notificação no dia em que vence.
- **Relatório para a consulta** em PDF e **planilhas** em CSV (R14).
- **Balança** pelo Health Connect (R12).

### 5.10 Ajustes — P0
Perfil e meta; tratamento e plano; canetas e estoque; locais que usa; lembretes; aparência (automática, clara, escura); mostrar IMC; dados; sobre (aviso médico e versão).

### 5.11 Depois do MVP (antes "Futuro", implementado em 19/11/2026)
- **Relatório em PDF** para a consulta e **exportação em CSV** (R14), em Ajustes → Seus dados.
- **Medidas corporais** pelo + (R9) e na Evolução.
- **Fotos de progresso** pelo + e na Evolução (R10).
- **Balança inteligente** pelo Health Connect (R12).
- **Widget** de tela inicial (R13).
- **Custos do tratamento** no Tratamento (R11).

### Fora do escopo
Login, conta, senha ou biometria; nuvem e sincronização; iPhone; recomendação de dose; contagem de "cliques" da caneta; dieta e calorias.

## 6. Regras de negócio

### R1. Agenda semanal
- A aplicação é semanal, num dia fixo (ex.: domingo). **Semana de tratamento** n = ⌊(data − início) / 7⌋ + 1, em que início é a data da primeira aplicação.
- **Próxima prevista** = a primeira data no dia da semana do plano que caia **3 dias ou mais depois** do último registro (aplicação ou semana pulada). Assim, uma aplicação atrasada volta para o dia habitual, e uma troca de dia respeita o intervalo mínimo da bula.
- Estados do cartão: `upcoming` (falta 1 dia ou mais), `today`, `taken` (registrada hoje) e `overdue` (a data prevista passou sem registro).
- **Não registrada:** o cartão pergunta "Você aplicou no domingo?" → [Sim, registrar] [Não, pulei]. Um link "O que diz a bula" explica a regra da dose esquecida (até 5 dias de atraso, aplicar assim que lembrar; depois disso, pular e seguir no dia habitual; nunca duas doses para compensar), sempre com "confirme com seu médico".
- **Pulei esta semana** grava uma aplicação sem dose.
- Registro a menos de 3 dias de outro: o formulário avisa de um provável registro repetido, sem impedir.
- Trocar o dia da semana é permitido. O app avisa se a última aplicação foi há menos de 3 dias (72 h).

### R2. Plano de doses (escalonamento)
- O plano é uma lista de etapas `{dose, semanas previstas | manutenção}`, **independente da marca**: ela pode trocar de Wegovy para Ozivy sem mudar o plano. Modelos prontos, todos editáveis:
  - **Wegovy:** 0,25 → 0,5 → 1 → 1,7 → 2,4 mg, 4 semanas cada; 2,4 mg como manutenção.
  - **Ozivy / Ozempic:** 0,25 mg (4 sem) → 0,5 mg (4 sem) → 1 mg (4 sem) → 2 mg (manutenção, se indicado).
  - **Personalizado.**
- A etapa atual é a dose da última aplicação. "Semana X de Y nesta dose" conta as aplicações seguidas nessa dose.
- Ao completar as semanas previstas, o app *sugere* a próxima dose, sem aplicar sozinho: "Pelo seu plano, a próxima seria 1,7 mg. Confirme com seu médico." → [Usar 1,7 mg] [Manter 1 mg].
- Uma dose diferente do plano é sempre aceita.

### R3. Canetas
- **Catálogo** (no código, editável ao cadastrar; confira na embalagem):

| Marca | Caneta | Conteúdo | Doses | Depois de aberta |
|---|---|---|---|---|
| Wegovy | 0,25 mg | 1 mg em 1,5 mL | 4 × 0,25 mg (fixa) | 6 semanas |
| Wegovy | 0,5 mg | 2 mg em 1,5 mL | 4 × 0,5 mg (fixa) | 6 semanas |
| Wegovy | 1 mg | 4 mg em 3 mL | 4 × 1 mg (fixa) | 6 semanas |
| Wegovy | 1,7 mg | 6,8 mg em 3 mL | 4 × 1,7 mg (fixa) | 6 semanas |
| Wegovy | 2,4 mg | 9,6 mg em 3 mL | 4 × 2,4 mg (fixa) | 6 semanas |
| Ozivy | 0,25/0,5 mg | 2 mg em 1,5 mL | 0,25 ou 0,5 mg (ajustável) | 6 semanas *(conferir na bula)* |
| Ozivy | 1 mg | 4 mg em 3 mL | 4 × 1 mg | 6 semanas *(conferir na bula)* |
| Ozempic | 0,25/0,5 · 1 · 2 mg | 2 · 4 · 8 mg | conforme a caneta | 6 semanas |
| Outra | manual | manual | manual | manual |

- **Caneta** (cada unidade comprada): marca, conteúdo total, dose fixa (Wegovy) ou ajustável (Ozivy, Ozempic), data de abertura e se já foi finalizada. Fechada = no estoque; aberta e não finalizada = em uso. A data de abertura é a da primeira aplicação com ela: registrar ou editar uma aplicação anterior à abertura antecipa a data, e excluir a única aplicação que abriu a caneta (ou trocar a caneta dela) devolve a caneta ao estoque. Abrir à mão, pela lista de canetas, também vale.
- **mg restante** = conteúdo total − soma das doses aplicadas com essa caneta. **Doses restantes** = ⌊mg restante / dose da próxima aplicação⌋.
- **Usar até** = data de abertura + validade depois de aberta (42 dias).
- Quando o mg restante for menor que a dose da próxima aplicação, a caneta é finalizada e o app oferece abrir a próxima do estoque, de qualquer marca. Ao subir a dose com uma caneta de dose fixa ainda com sobra, o app pergunta se ela quer finalizá-la.
- **Avisos:** a próxima aplicação usa a última dose; estoque zerado com 1 dose ou menos ("hora de comprar"); caneta aberta vence em 7 dias ou menos.
- A caneta tem um pequeno excedente para o teste de fluxo. O app conta só as doses nominais.

### R4. Peso
- **Pesagem livre:** quantas vezes por dia ela quiser. Faixa válida de 30 a 300 kg, com até 2 casas decimais.
- Para análise, o app usa **uma média por dia**: várias pesagens no mesmo dia viram um ponto só na tendência. No gráfico, cada pesagem aparece como ponto.
- **Tendência** (média móvel exponencial ajustada ao intervalo, sobre as médias diárias): t₁ = p₁; tᵢ = tᵢ₋₁ + a·(pᵢ − tᵢ₋₁), com a = 1 − (1 − α)^Δdias e α = 0,15. Funciona com pesagens diárias, semanais ou irregulares.
- **Ritmo** (kg/semana) = inclinação da regressão linear da tendência nos últimos 28 dias × 7. Exige 4 dias com pesagem ou mais em 14 dias ou mais; senão, "dados insuficientes".
- **O que usa a última pesagem:** o número em destaque, o total desde o início, o progresso da meta e o "faltam X kg". A variação ao registrar compara com a pesagem anterior.
- **O que usa a tendência:** as variações de semana, período, fase e semana a semana, e a confirmação dos marcos.
- **IMC** = peso / altura². Nos Ajustes ela escolhe: ocultar, só o número (padrão) ou o número com a faixa da OMS.
- **Marcos:** −5%, −10%, −15% e −20% do peso inicial, a cada 5 kg e a meta. Comemoração discreta, uma vez por marco, quando a *tendência* cruza o alvo.
- **Platô:** |ritmo de 21 dias| < 0,1 kg/sem com 4 dias de pesagem ou mais → mensagem acolhedora ("platôs são comuns no tratamento").
- **Projeção (P1, implementada):** só aparece se o ritmo das últimas 4 semanas for −0,1 kg/sem ou mais rápido. Data = hoje + (tendência − meta) / |ritmo|, mostrada como mês aproximado ("Se o ritmo das últimas 4 semanas (−0,62 kg por semana) continuar, a meta chega por volta de abril de 2027") e escondida se passar de 18 meses.
- **Por fase de dose:** para cada etapa (da primeira aplicação daquela dose até a primeira da dose seguinte), a variação da tendência e o ritmo.
- **Semana a semana:** semana de tratamento ancorada no dia da aplicação; variação = tendência no fim − tendência no início.
- **Cores:** queda em verde-azulado e aumento em âmbar, nunca vermelho, sempre com seta e sinal.

### R5. Locais de aplicação
- Seis regiões: abdômen esquerdo e direito (a 5 cm do umbigo), coxa esquerda e direita (frente) e braço esquerdo e direito (parte superior). São os locais indicados na bula.
- O mapa usa a **convenção de espelho**: o lado esquerdo dela aparece à esquerda da tela, com rótulos E e D sempre visíveis.
- **Sugestão** = a região ativa usada há mais tempo. Empate segue a ordem fixa: AE, AD, CE, CD, BE, BD.

### R6. Sintomas e notas
- Sintomas: náusea, vômito, diarreia, constipação, azia ou refluxo, dor abdominal, dor de cabeça, cansaço, tontura, reação no local, pouca fome, saciedade rápida e "outro" (com o nome, se ela quiser). Intensidade de 1 a 3 (leve, moderada, forte), a mesma para os sintomas marcados juntos.
- "Bem" registra que está tudo bem, sem intensidade, e não combina com sintomas.
- Notas livres entram na mesma linha do tempo.
- A dose e os dias desde a última aplicação são calculados na hora de mostrar (não precisam ser gravados).
- **Padrões** (P1): conta os dias distintos com cada sintoma. (1) *Depois da aplicação:* com 3 registros ou mais até 6 dias depois de uma aplicação, procura a janela de 1 dia ou de 2 dias seguidos com mais registros; vira padrão se tiver 3 ou mais e 60% ou mais deles. (2) *Subida de dose:* semanas de aplicação que começam com dose maior que a anterior; vira padrão com 3 registros ou mais nessas semanas, pelo menos 2 semanas sem subida para comparar e frequência por semana o dobro ou mais. Mostra até 3, do mais forte para o mais fraco.

### R7. Edição, exclusão e desfazer
Tudo é editável. Excluir pede confirmação e depois mostra "Desfazer" por 5 s; desfazer devolve o registro exatamente como estava (mesmo id). Uma caneta que já tem aplicações não pode ser excluída, só finalizada.

### R9. Medidas
- Seis medidas: cintura, quadril, abdômen (na altura do umbigo), busto, braço e coxa, em centímetros com até uma casa (10 a 300 cm). Gravadas em milímetros.
- Uma **medição** são as medidas feitas no mesmo dia e hora; ela edita e exclui junta (com "Desfazer").
- A Evolução mostra, de cada medida, a última, a variação desde a primeira (queda em verde-azulado, aumento em âmbar, com seta) e a relação cintura/quadril da última medição que tem as duas.

### R10. Fotos de progresso
- Da câmera ou da galeria. A foto é reduzida para no máximo 1280 px (JPEG) e fica na pasta privada do app, fora da galeria do celular.
- A data é a de agora (câmera) ou a original da foto (galeria, pelo EXIF; sem EXIF, agora).
- A Evolução mostra as mais recentes; a tela de fotos tem "Antes e agora" (a primeira e a última), a grade e a foto em tela cheia com a pesagem mais próxima (até 7 dias) e "Comparar com a primeira".
- Excluir tem "Desfazer"; o arquivo só é apagado na próxima abertura do app. As fotos vão no backup.

### R11. Custos
- Preço opcional em cada caneta (no cadastro ou em "Preços das canetas").
- **Total** = soma dos preços informados. **Por mês** = preços das canetas com preço já abertas ÷ dias desde a abertura da primeira delas × 30,44, a partir de 28 dias; antes disso, a média por caneta. Assim, canetas antigas sem preço não diluem a conta. Caneta sem preço fica de fora, e o cartão avisa quantas são.

### R12. Balança (Health Connect)
- Só lê o peso (permissão `READ_WEIGHT`); nada é escrito no Health Connect e nada sai do celular.
- Primeira importação: os últimos 30 dias (o Health Connect não entrega mais que isso sem uma permissão extra de histórico). Depois, desde a última importação, menos 2 dias (a balança às vezes sincroniza atrasada).
- Não entra pesagem a até 30 minutos e 100 g de outra que já está no app (ela digitou e a balança mandou), nem fora da faixa de 30 a 300 kg.
- Com a balança ligada, importa ao abrir o app e ao voltar para ele, no máximo a cada 15 minutos; "Importar agora" nos Ajustes.

### R13. Widget
- Um widget (4 × 2, redimensionável) com a próxima aplicação nos quatro estados de R1, a dose e o local sugeridos e a caneta em uso. **Sem peso**, por privacidade.
- No dia da aplicação e quando ela não foi registrada, um botão "Registrar" abre o registro (a atrasada já com o dia previsto).
- Atualiza a cada registro ou ajuste, ao abrir o app e de hora em hora.
- Nos Ajustes, "Adicionar à tela inicial" pede ao Android para colocar o widget (o celular confirma); se o launcher não aceitar, o app explica o caminho pela tela inicial.

### R14. Relatório e planilhas
- **Relatório (PDF, A4):** período de 1, 3 ou 6 meses ou tudo; resumo (última pesagem, peso inicial, variação desde o início, tendência e ritmo, IMC, meta e projeção), gráfico de peso com as faixas de dose, por fase de dose, aplicações, sintomas (registros e intensidade mais comum), padrões, medidas e, se ela quiser, as notas do Diário. Termina com o aviso de que não substitui avaliação médica. Compartilhar ou imprimir.
- **Planilhas (CSV):** pesagens (com a tendência do dia), aplicações, sintomas e notas, medidas. Separador ";", vírgula decimal, datas dd/mm/aaaa e BOM UTF-8, para abrir direto no Excel e no Google Planilhas em português.

### R8. Datas, números e idioma
- Tudo em pt-BR: "72,4 kg", "−1,2 kg", "0,5 mg", "dom., 23/11".
- Datas gravadas como texto na hora local do celular: `AAAA-MM-DD HH:MM`. O Brasil não tem horário de verão, e o texto ordena e agrupa por dia sem conversões.

## 7. Histórias principais e critérios de aceite

| # | História | Pronto quando |
|---|---|---|
| H1 | Registrar a aplicação em até 3 toques a partir da Hoje | O cartão muda para *aplicada*, a caneta desconta a dose e o próximo lembrete é reagendado. |
| H2 | Registrar o peso a qualquer momento, em até 5 s | O valor aparece na Hoje e no gráfico, com a variação desde a pesagem anterior. |
| H3 | Saber onde aplicar | A sugestão nunca repete a última região quando há outra ativa. |
| H4 | Não esquecer | Notificação no dia e hora; reforço 3 h depois (configurável) só se não houver registro. |
| H5 | Não ficar sem caneta | Ao registrar a penúltima dose aparece o aviso de última dose; com estoque zerado, o aviso de compra. |
| H6 | Já estar em tratamento | Informar o início e as fases no onboarding gera as aplicações retroativas, editáveis depois. |
| H7 | Trocar de celular | Exportar e restaurar o backup recupera 100% dos dados, fotos inclusive. |
| H8 | Registrar pela notificação | "Já apliquei" grava a aplicação sem abrir o app e confirma o que gravou; "Lembrar em 1 h" repete o lembrete. |
| H9 | Levar o histórico à consulta | O PDF do período sai em 2 toques a partir dos Ajustes. |
| H10 | Pesar na balança inteligente | A pesagem aparece no Leve sozinha ao abrir o app, sem duplicar a que ela digitou. |

## 8. Aviso (onboarding e "Sobre")

> O Leve é uma ferramenta pessoal de registro e lembretes. Não substitui orientação médica. Doses e mudanças de dose seguem a prescrição.

## 9. Fontes consultadas (bula e mercado)

- Ozempic, bula: "Após aberto, válido por 6 semanas", abaixo de 30 °C ou na geladeira (2–8 °C); 2 mg em 1,5 mL; 4 mg em 3 mL. [consultaremedios.com.br](https://consultaremedios.com.br/ozempic/bula) · [bula.com.br](https://bula.com.br/original/ozempic)
- Wegovy, bula: 6 semanas depois de aberta; concentrações de 0,68 / 1,34 / 1,34 / 2,27 / 3,2 mg/mL. [consultaremedios.com.br](https://consultaremedios.com.br/wegovy/bula)
- Ozivy (EMS): 1,34 mg/mL; caneta de 1,5 mL com doses de 0,25 ou 0,5 mg e caneta de 3 mL com doses de 1 mg. [Drogaria Pacheco, 0,25/0,5 mg](https://www.drogariaspacheco.com.br/ozivy-semaglutida-0-25mg-e-0-5mg-1-caneta-1-5ml-6-agulhas/p) · [Drogaria Pacheco, 1 mg](https://www.drogariaspacheco.com.br/ozivy-semaglutida-1mg-1-caneta-3ml-4-agulhas/p) · [ICTQ](https://ictq.com.br/farmacia-clinica/ems-recebe-aprovacao-para-vender-primeira-caneta-de-semaglutida-nacional). A validade depois de aberta do Ozivy não foi confirmada: **conferir na bula**.
- Dose esquecida e troca de dia, conferidas na bula em 19/11/2026: se esquecer, aplicar assim que lembrar, até 5 dias depois do dia previsto; passados 5 dias, pular e aplicar no dia habitual seguinte; nunca duas doses para compensar. O dia da semana pode mudar se houver pelo menos 3 dias (72 h) entre duas aplicações. [Wegovy, EMA](https://www.ema.europa.eu/en/documents/product-information/wegovy-epar-product-information_is.pdf) · [Wegovy, posologia (bula.com.br)](https://bula.com.br/wegovy/posologia-como-usar) · [Ozempic, EMA (pt)](https://www.ema.europa.eu/pt/documents/product-information/ozempic-epar-product-information_pt.pdf) · [Ozempic, bula (Drogarias Pacheco)](https://www.drogariaspacheco.com.br/ozempic/bula)
- Genéricos: a Anvisa aprovou o primeiro genérico de semaglutida em caneta em 17/08/2026, com 1,34 mg/mL. [CFF](https://site.cff.org.br/noticia/Noticias-gerais/17/08/2026/anvisa-aprova-primeiro-generico-de-semaglutida-em-caneta-no-brasil)
- Wegovy 7,2 mg aprovado pela Anvisa (maio/2026). [TNH1](https://www.tnh1.com.br/noticia/nid/caneta-emagrecedora-de-alta-dose-recebe-aprovacao-da-anvisa-no-brasil/)
