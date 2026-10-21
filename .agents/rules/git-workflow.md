---
trigger: always_on
---

# Fluxo de Trabalho Git e Commits Incrementais

## Commits Frequentes por Sub-Etapas Lógicas
- Ao executar planos, tarefas ou refatorações compostas por fases ou múltiplas etapas, não acumule todas as alterações para commitar no final.
- Realize commits granulares e atômicos a cada sub-etapa lógica implementada e validada (ex: criação de componente, adição de teste, ajuste de regra, refatoração de serviço).
- Não há restrição quanto à quantidade de commits: priorize a granularidade, clareza e rastreabilidade do histórico.

## Execução via Terminal
- Execute diretamente os comandos `git add` e `git commit` no terminal após a conclusão de cada sub-etapa.
- Use mensagens seguindo rigorosamente o padrão Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, etc.).
- Mantenha os commits locais, realizando `git push` apenas sob instrução explícita do usuário.
- Não acumule o projeto inteiro pra depois fazer os commits, realize-os ao final de cada subtarefa.
- Além do tipo e título do commit, crie uma descrição detalhada sobre cada alteração.
