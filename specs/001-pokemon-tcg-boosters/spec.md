# Feature Specification: Abertura de Boosters Pokémon TCG

**Feature Branch**: `001-pokemon-tcg-boosters`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Crie um jogo web de abrir boosters do Pokémon TCG. [...] cada pacote tem 6 cartas únicas (nunca repete carta no mesmo pacote), exibidas em ordem da mais comum até a mais rara, com animação de revelação carta por carta. As 4 primeiras cartas são sempre comuns; a 5ª é incomum (90%) ou rara (10%); a 6ª segue a distribuição: comum 0%, incomum 0%, rara 60%, dupla rara 25%, arte secreta 10%, dupla arte secreta 4.5%, legendária 0.5%. Coleção persistente via LocalStorage com filtros por raridade e contagem de cópias. Front-end puro, responsivo, sem backend. Fora do escopo: trocas, batalhas, login, compra de boosters."

## Clarifications

### Session 2026-07-27

- Q: Cartas duplicadas no mesmo booster? → A: Nunca — cada pacote sempre contém 6 cartas distintas, sem exceção.
- Q: Re-baixar imagens existentes? → A: Não; o processo de obtenção do catálogo de cartas deve ser idempotente (não deve baixar novamente uma imagem já presente localmente).
- Q: Mostrar % de raridade ao usuário? → A: Não no MVP — as probabilidades de sorteio não são exibidas na interface.
- Q: Cartas removidas da API depois? → A: A coleção mantém no LocalStorage as cartas já obtidas mesmo que elas deixem de existir na fonte/catálogo original.
- Q: Como o sistema escolhe a carta específica dentro da raridade sorteada em cada posição? → A: Seleção uniforme entre todas as cartas daquela raridade (cada carta da categoria tem a mesma chance).
- Q: O sistema deve destacar visualmente cartas "novas" (1ª cópia) vs "duplicatas"? → A: Sim — indicador visual de "NOVA" tanto na animação de revelação quanto na tela de coleção.
- Q: A tela de coleção deve exibir estatísticas agregadas de progresso, além da contagem por carta? → A: Sim — progresso total (ex.: "142/207 cartas obtidas") e progresso por raridade (ex.: "12/25 Raras").
- Q: Qual critério de ordenação padrão para as cartas na tela de coleção? → A: Por raridade (crescente) e, dentro da mesma raridade, por nome.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir um pacote e revelar as cartas (Priority: P1)

Um colecionador abre um pacote de cartas e assiste, uma de cada vez, à revelação animada das 6 cartas do pacote, começando pela mais comum e terminando na mais rara possível daquele pacote.

**Why this priority**: É o núcleo da experiência ("abrir boosters"); sem esta jornada não existe produto. Todo o resto (coleção, filtros) depende de pacotes terem sido abertos.

**Independent Test**: Pode ser testado sozinho abrindo um pacote e verificando que 6 cartas distintas aparecem, em ordem crescente de raridade, cada uma com sua própria animação de revelação, sem depender de nenhuma outra funcionalidade.

**Acceptance Scenarios**:

1. **Given** o jogador está na tela inicial, **When** ele escolhe abrir um pacote, **Then** o sistema sorteia 6 cartas distintas (sem repetição dentro do pacote) e as exibe uma a uma, em ordem da menos rara para a mais rara.
2. **Given** um pacote foi sorteado, **When** cada carta é revelada, **Then** uma animação de revelação é exibida para aquela carta antes de avançar para a próxima.
3. **Given** um pacote está sendo aberto, **When** as 4 primeiras cartas são reveladas, **Then** todas as 4 pertencem à raridade Comum.
4. **Given** um pacote está sendo aberto, **When** a 5ª carta é revelada, **Then** ela é Incomum ou Rara, respeitando a proporção 90%/10% ao longo de muitas aberturas.
5. **Given** um pacote está sendo aberto, **When** a 6ª carta é revelada, **Then** sua raridade segue a distribuição definida (Rara 60%, Dupla Rara 25%, Arte Secreta 10%, Duplo Arte Secreta 4.5%, Legendária 0.5%) ao longo de muitas aberturas, e nunca é Comum ou Incomum.
6. **Given** uma carta revelada é a primeira cópia que o jogador já obteve dela, **When** ela é exibida na animação de revelação, **Then** o sistema destaca visualmente que a carta é "NOVA"; caso o jogador já possuísse ao menos uma cópia antes deste pacote, a carta é exibida como duplicata (sem o destaque de "NOVA").

---

### User Story 2 - Consultar a coleção acumulada (Priority: P2)

Um colecionador consulta sua coleção para ver quais cartas já obteve e quantas cópias de cada uma possui, mesmo depois de fechar e reabrir o navegador.

**Why this priority**: Sem persistência e visualização da coleção, abrir pacotes não gera progresso percebido; é o que transforma aberturas repetidas em uma coleção significativa.

**Independent Test**: Pode ser testado abrindo um ou mais pacotes, fechando o navegador, reabrindo a aplicação e conferindo que as cartas obtidas e suas contagens de cópias continuam corretas.

**Acceptance Scenarios**:

1. **Given** o jogador já abriu pacotes anteriormente, **When** ele reabre a aplicação em uma nova sessão, **Then** todas as cartas obtidas anteriormente e suas contagens de cópias aparecem na coleção.
2. **Given** uma carta já existente na coleção é sorteada novamente, **When** o pacote termina de ser aberto, **Then** a contagem de cópias dessa carta na coleção aumenta em 1, sem criar uma entrada duplicada.
3. **Given** a coleção está vazia (nenhum pacote aberto ainda), **When** o jogador acessa a tela de coleção, **Then** o sistema indica claramente que nenhuma carta foi obtida ainda.
4. **Given** uma carta na coleção tem exatamente 1 cópia obtida na sessão de abertura mais recente, **When** o jogador visualiza a coleção, **Then** essa carta continua identificável como obtida recentemente ao menos durante a sessão em que foi revelada (consistente com o destaque de "NOVA" da revelação).

---

### User Story 3 - Filtrar a coleção por raridade (Priority: P3)

Um colecionador filtra a visualização da coleção para ver apenas as cartas de uma raridade específica (por exemplo, só as Legendárias).

**Why this priority**: Melhora a usabilidade da coleção conforme ela cresce, mas a coleção já entrega valor mesmo sem filtro; por isso vem depois das duas primeiras histórias.

**Independent Test**: Pode ser testado, com uma coleção já populada, selecionando cada uma das 7 categorias de raridade e conferindo que apenas cartas daquela categoria aparecem.

**Acceptance Scenarios**:

1. **Given** a coleção contém cartas de várias raridades, **When** o jogador seleciona um filtro de raridade específica, **Then** somente as cartas daquela raridade são exibidas, com suas contagens de cópias.
2. **Given** um filtro de raridade está aplicado, **When** o jogador remove o filtro (ou seleciona "todas"), **Then** a coleção completa volta a ser exibida.
3. **Given** o jogador está na tela de coleção, **When** nenhum filtro de raridade específico está aplicado, **Then** o sistema exibe o progresso total (nº de cartas distintas obtidas / total de cartas existentes) e o progresso de cada uma das 7 raridades (nº distinto obtido / total daquela raridade).

---

### Edge Cases

- O que acontece quando o jogador abre a aplicação pela primeira vez, sem nenhuma carta na coleção e sem nenhum pacote aberto?
- Como o sistema se comporta se o armazenamento local do navegador estiver cheio, bloqueado (ex.: modo privado restritivo) ou for limpo manualmente pelo usuário durante o uso?
- O que acontece se o jogador fechar a aba ou recarregar a página no meio da animação de revelação de um pacote (antes das 6 cartas serem reveladas)?
- Como o sistema garante que um pacote sempre consiga sortear 6 cartas distintas mesmo que alguma categoria de raridade tenha poucas cartas disponíveis no total?
- O que o jogador vê ao tentar acessar a tela de coleção ou aplicar um filtro de raridade para o qual ele ainda não possui nenhuma carta?
- Se uma carta obtida por um jogador deixar de existir no catálogo/fonte original em uma atualização futura, ela permanece na coleção persistida do jogador (LocalStorage) sem ser removida retroativamente (ver FR-018).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que o jogador inicie a abertura de um pacote a qualquer momento, sem necessidade de conta, login ou qualquer forma de compra/moeda.
- **FR-002**: Cada pacote DEVE conter exatamente 6 cartas distintas; a mesma carta nunca pode aparecer duas vezes no mesmo pacote.
- **FR-003**: O sistema DEVE classificar cada carta do catálogo em exatamente uma de 7 categorias de raridade: Comum, Incomum, Rara, Dupla Rara, Arte Secreta, Duplo Arte Secreta, Legendária.
- **FR-004**: As posições 1ª a 4ª de cada pacote DEVEM ser sempre preenchidas com cartas da categoria Comum.
- **FR-005**: A 5ª posição de cada pacote DEVE ser sorteada como Incomum com 90% de probabilidade ou Rara com 10% de probabilidade.
- **FR-006**: A 6ª posição de cada pacote DEVE ser sorteada segundo a distribuição: Rara 60%, Dupla Rara 25%, Arte Secreta 10%, Duplo Arte Secreta 4.5%, Legendária 0.5% (Comum e Incomum têm 0% de chance nesta posição).
- **FR-007**: As 6 cartas de um pacote DEVEM ser exibidas ao jogador em ordem crescente de raridade (da menos rara para a mais rara dentre as 6 sorteadas).
- **FR-008**: O sistema DEVE revelar as cartas de um pacote uma de cada vez, com uma animação de revelação distinta por carta, e não todas simultaneamente.
- **FR-009**: O sistema DEVE persistir a coleção do jogador (cartas obtidas e quantidade de cópias de cada) localmente no navegador, de forma que sobreviva ao fechamento e reabertura do navegador.
- **FR-010**: Ao final de cada abertura de pacote, o sistema DEVE atualizar a coleção persistida, incrementando a contagem de cópias de cada carta obtida (criando a entrada se for a primeira cópia).
- **FR-011**: O sistema DEVE exibir, para cada carta na coleção, quantas cópias o jogador já obteve.
- **FR-012**: O sistema DEVE permitir ao jogador filtrar a visualização da coleção por qualquer uma das 7 categorias de raridade, e também visualizar a coleção completa sem filtro.
- **FR-022**: A listagem de cartas na tela de coleção (com ou sem filtro de raridade aplicado) DEVE ser ordenada por raridade crescente e, dentro da mesma raridade, por nome da carta em ordem alfabética.
- **FR-013**: A interface DEVE se adaptar a diferentes tamanhos de tela (celular, tablet, desktop), permanecendo utilizável e sem sobreposição ou corte de elementos.
- **FR-014**: O sistema NÃO DEVE incluir funcionalidades de troca de cartas entre jogadores, batalhas, autenticação/login de usuário, ou qualquer mecanismo de compra de pacotes.
- **FR-015**: A lógica de sorteio de raridade DEVE ser isolada de forma que a distribuição observada ao longo de um grande número de aberturas simuladas possa ser verificada automaticamente contra as porcentagens definidas nas FR-005 e FR-006.
- **FR-016**: O processo de obtenção/atualização do catálogo de cartas DEVE ser idempotente: reexecutá-lo NÃO DEVE baixar novamente uma imagem de carta já presente localmente, nem duplicar arquivos existentes.
- **FR-017**: O sistema NÃO DEVE exibir ao jogador, no MVP, as porcentagens/probabilidades de sorteio de raridade usadas internamente (FR-005, FR-006).
- **FR-018**: Se uma carta deixar de existir no catálogo/fonte original após já ter sido obtida por um jogador, ela DEVE permanecer inalterada na coleção persistida (LocalStorage) desse jogador — a coleção nunca é purgada retroativamente por mudanças na fonte.
- **FR-019**: Após sortear a raridade de uma posição do pacote (FR-004, FR-005, FR-006), o sistema DEVE escolher a carta específica daquela raridade com probabilidade uniforme entre todas as cartas elegíveis da categoria (excluindo apenas as já sorteadas no mesmo pacote, por força da FR-002) — nenhuma carta de uma mesma raridade pode ter chance maior que outra.
- **FR-020**: O sistema DEVE indicar visualmente, tanto na animação de revelação quanto na tela de coleção, se a cópia de uma carta obtida é a primeira do jogador ("NOVA") ou uma duplicata de uma carta já possuída anteriormente.
- **FR-021**: A tela de coleção DEVE exibir o progresso de coleção agregado: quantidade de cartas distintas já obtidas em relação ao total de cartas existentes, tanto de forma geral quanto separadamente para cada uma das 7 categorias de raridade.

### Key Entities *(include if feature involves data)*

- **Carta**: Uma carta colecionável individual; possui identidade única, uma imagem associada e pertence a exatamente uma das 7 categorias de raridade.
- **Categoria de Raridade**: Uma das 7 classificações (Comum, Incomum, Rara, Dupla Rara, Arte Secreta, Duplo Arte Secreta, Legendária) que determina tanto a organização das cartas quanto as probabilidades de sorteio em cada posição do pacote. Cada categoria tem um total conhecido de cartas existentes, usado para calcular o progresso de coleção (FR-021).
- **Pacote (Booster)**: Um conjunto de exatamente 6 cartas distintas, sorteadas para uma única abertura, com uma ordem de revelação definida (da menos rara para a mais rara).
- **Coleção do Jogador**: Registro persistente, associado ao navegador do jogador, de todas as cartas já obtidas e da quantidade de cópias de cada uma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um jogador consegue abrir um pacote e ver as 6 cartas reveladas, uma a uma com animação, do início ao fim, sem qualquer erro ou trava, em qualquer dispositivo (celular, tablet, desktop).
- **SC-002**: Ao simular 10.000 aberturas de pacote, a proporção observada de raridades sorteadas na 5ª e na 6ª posição fica dentro de uma margem de ±2 pontos percentuais das porcentagens especificadas (90/10 na 5ª; 60/25/10/4.5/0.5 na 6ª).
- **SC-003**: 100% das cartas obtidas e suas contagens de cópias permanecem corretas após o jogador fechar completamente o navegador e reabrir a aplicação.
- **SC-004**: Um jogador consegue localizar todas as cartas de uma raridade específica em sua coleção em poucos segundos, usando o filtro de raridade, sem precisar rolar por toda a coleção.
- **SC-005**: A aplicação permanece totalmente utilizável (nenhum elemento cortado, sobreposto ou inacessível) em larguras de tela desde aproximadamente 360px (celular) até 1920px (desktop).
- **SC-006**: Um jogador novo, sem nenhuma orientação prévia, consegue abrir seu primeiro pacote e entender o resultado (quais cartas ganhou) em menos de 1 minuto de uso.
- **SC-007**: A qualquer momento, um jogador consegue identificar, em poucos segundos e sem cálculo manual, quantas cartas distintas já possui no total e em cada raridade, em relação ao total existente.

## Assumptions

- A abertura de pacotes é ilimitada e gratuita: como "compra de boosters" está fora de escopo, não existe sistema de moeda, estoque ou limite de aberturas — o jogador pode abrir quantos pacotes quiser, a qualquer momento.
- O catálogo de cartas disponíveis é fixo e conhecido previamente (não muda durante o uso da aplicação), com cartas suficientes em cada uma das 7 categorias de raridade para sempre permitir sortear 6 cartas distintas por pacote.
- A interface é apresentada em português, consistente com a nomenclatura das 7 categorias de raridade usada nesta especificação.
- Não há requisito de conectividade contínua: uma vez carregada, a aplicação funciona sem depender de acesso à internet, já que não há backend.
- Cada navegador/dispositivo mantém sua própria coleção independente; não há sincronização de coleção entre dispositivos diferentes (consequência direta de não haver login/conta).
- Se a animação de revelação for interrompida (ex.: recarregar a página no meio de um pacote), é aceitável que o pacote em andamento seja perdido, desde que a coleção já persistida antes daquele pacote não seja corrompida.
