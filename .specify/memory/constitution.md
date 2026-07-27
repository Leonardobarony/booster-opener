<!--
Sync Impact Report
==================
Version change: (template, unversioned) → 1.0.0
Rationale for MAJOR: Initial ratification — first concrete adoption of the constitution
  (not a change to prior governing principles, but treated as 1.0.0 since it establishes
  the binding baseline for all future amendments).

Modified principles: N/A (initial fill of template placeholders)

Added sections:
- I. Front-End Puro (Sem Backend)
- II. Persistência Client-Side
- III. Distribuição Probabilística Testável
- IV. Responsividade Obrigatória
- V. Assets Organizados em Disco
- Restrições Técnicas Adicionais
- Fluxo de Desenvolvimento
- Governance

Removed sections: N/A

Templates requiring updates:
- ✅ .specify/templates/plan-template.md — Constitution Check gate reads from this file
  dynamically; no hardcoded contradiction found (Option 2/3 "web app"/"mobile" structures
  remain as removable options per authoring instructions already in the template).
- ✅ .specify/templates/spec-template.md — generic, no changes required.
- ✅ .specify/templates/tasks-template.md — sample tasks are explicitly illustrative and
  replaced per-feature; no changes required.
- ✅ .claude/skills/speckit-*/SKILL.md — no CLAUDE-only or agent-specific references found.

Follow-up TODOs: none.
-->

# First Projeto Constitution
<!-- First Projeto: aplicação client-side de distribuição/sorteio probabilístico -->

## Core Principles

### I. Front-End Puro (Sem Backend)
Toda funcionalidade DEVE ser implementada exclusivamente em HTML, CSS e JavaScript
executados no navegador do usuário. NENHUM servidor de aplicação, API própria, banco
de dados remoto ou processo backend é permitido em qualquer parte do sistema. Se uma
funcionalidade parecer exigir processamento server-side, o design da funcionalidade
DEVE ser revisto até caber inteiramente no navegador antes de ser aceito.
Rationale: garante que o projeto seja distribuído como arquivos estáticos, sem custos
de infraestrutura, sem superfície de ataque de servidor e sem dependência de
disponibilidade de serviços externos.

### II. Persistência Client-Side
Todo dado que precise sobreviver entre sessões DEVE ser armazenado no próprio
navegador (localStorage, sessionStorage, IndexedDB ou equivalente). Nenhuma escrita
em servidor remoto é permitida para persistir estado da aplicação. Mecanismos de
exportação/importação manual (arquivo local baixado/carregado pelo usuário) são
aceitáveis como forma de backup ou portabilidade de dados.
Rationale: mantém coerência com o Princípio I e garante que o usuário tenha posse
total dos seus próprios dados, sem exigir conta ou serviço externo.

### III. Distribuição Probabilística Testável
Toda funcionalidade que dependa de aleatoriedade ou distribuição probabilística
(sorteios, geração aleatória, simulações, pesos) DEVE isolar essa lógica em uma
unidade testável, independente da camada de UI, aceitando uma seed configurável para
tornar os resultados reproduzíveis em testes automatizados. Testes automatizados
DEVEM rodar um número suficientemente grande de amostras e validar, com margem de
tolerância estatística explícita, que a distribuição observada é consistente com a
distribuição esperada.
Rationale: comportamento aleatório não testado é fonte comum de bugs silenciosos,
vieses não intencionais e resultados percebidos como injustos pelos usuários.

### IV. Responsividade Obrigatória
Toda tela e todo componente de interface DEVE se adaptar corretamente a diferentes
tamanhos de viewport (mobile, tablet, desktop), usando técnicas responsivas (CSS
Grid/Flexbox, media queries, unidades relativas). Nenhuma tela ou componente pode ser
considerado concluído sem validação visual em pelo menos um breakpoint mobile e um
breakpoint desktop.
Rationale: o público final acessa a partir de dispositivos variados; a ausência de
responsividade é tratada como defeito de implementação, não como melhoria opcional.

### V. Assets Organizados em Disco
Todo asset estático (imagens, sons, fontes, dados em JSON/CSV, etc.) DEVE residir em
uma estrutura de diretórios previsível e documentada (ex.: `/assets/images`,
`/assets/sounds`, `/assets/data`) e ser referenciado por caminho relativo. Assets NÃO
DEVEM ser embutidos como blob/base64 diretamente no código-fonte, salvo justificativa
explícita registrada no plano da feature (ex.: ícone único e minúsculo inline).
Rationale: mantém o repositório navegável e auditável, facilita a substituição ou
atualização de assets, e evita builds e diffs inchados.

## Restrições Técnicas Adicionais

Stack permitida: HTML5, CSS3 e JavaScript (ES modules), sem frameworks ou runtimes de
servidor. Ferramentas de build/bundling são permitidas apenas quando o artefato final
continuar sendo 100% estático — deployável a partir de qualquer servidor de arquivos
ou CDN, sem processo Node (ou equivalente) em execução em produção. Dependências
externas via CDN DEVEM ter fallback local ou ser evitadas, para que a aplicação
continue funcional offline após o primeiro carregamento sempre que tecnicamente
viável.

## Fluxo de Desenvolvimento

Toda nova feature DEVE, antes de ser considerada concluída:

1. Passar pelo Constitution Check do plano de implementação, confirmando aderência
   aos cinco princípios acima antes do início da Fase 0 (research).
2. Incluir testes automatizados para qualquer lógica de distribuição probabilística
   introduzida ou alterada (Princípio III).
3. Ser verificada manualmente em pelo menos dois breakpoints (mobile e desktop) antes
   de ser marcada como pronta (Princípio IV).

Exceções a qualquer princípio DEVEM ser registradas e justificadas explicitamente na
seção "Complexity Tracking" do plano correspondente.

## Governance

Esta constituição substitui qualquer prática de desenvolvimento ad-hoc anterior e
prevalece sobre preferências individuais de implementação. Emendas a este documento
exigem: (1) proposta explícita da mudança com justificativa; (2) atualização de
versão conforme a política semântica abaixo; (3) verificação de que os templates
dependentes (`plan-template.md`, `spec-template.md`, `tasks-template.md`) permanecem
consistentes com os princípios revisados.

Versionamento segue semântica MAJOR.MINOR.PATCH: MAJOR para remoção ou redefinição
incompatível de princípios existentes; MINOR para adição de um novo princípio ou
seção, ou expansão material de uma diretriz existente; PATCH para clarificações,
correções de redação ou ajustes não semânticos.

Todo plano de implementação e toda revisão de código DEVEM verificar conformidade com
os princípios acima. Qualquer complexidade ou exceção introduzida DEVE ser justificada
explicitamente no plano; a ausência de justificativa é motivo para rejeitar o plano.

**Version**: 1.0.0 | **Ratified**: 2026-07-27 | **Last Amended**: 2026-07-27
