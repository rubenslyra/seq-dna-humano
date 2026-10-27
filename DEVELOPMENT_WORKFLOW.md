# Workflow de Branches — Seq DNA Humano

## Estrutura de Branches

### `main` (Produção / GitHub Pages)
- **Propósito:** Servir exclusivamente como fonte do build estático para GitHub Pages.
- **Conteúdo permitido:** Apenas a pasta `docs/` com o build otimizado (`vite build`).
- **Regras:**
  - Nenhum código-fonte ativo deve ser commitado diretamente na `main`.
  - Commits na `main` são gerados automaticamente via merge da `develop` após validação.
  - A pasta `docs/` é ignorada no `.gitignore` da `develop` para evitar conflitos, mas deve existir na `main`.

### `develop` (Desenvolvimento Ativo)
- **Propósito:** Branch principal para integração de novas features, correções e refatorações.
- **Conteúdo:** Todo o código-fonte ativo, configurações de build e documentação técnica.
- **Regras:**
  - Todas as branches de feature devem ser criadas a partir da `develop`.
  - Merges na `develop` devem passar por revisão ou validação prévia.
  - O build de produção (`docs/`) não deve ser versionado nesta branch.

### Branches de Feature (`feature/*`, `fix/*`, `chore/*`)
- **Propósito:** Isolamento de trabalho específico antes da integração.
- **Nomenclatura:**
  - `feature/nome-da-feature` — Novas funcionalidades.
  - `fix/nome-do-bug` — Correções de bugs.
  - `chore/tarefa-manutencao` — Tarefas de manutenção, atualizações de deps, etc.
- **Ciclo de Vida:**
  1. Criar a partir da `develop`: `git checkout -b feature/minha-feature develop`
  2. Desenvolver e commitar localmente.
  3. Push e Pull Request para `develop`.
  4. Após merge, deletar a branch remota e local.

## Fluxo de Trabalho Padrão

1. **Iniciar Nova Tarefa:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nova-feature
   ```

2. **Desenvolvimento:**
   - Faça commits atômicos e descritivos.
   - Mantenha a branch sincronizada com `develop` se necessário:
     ```bash
     git fetch origin
     git rebase origin/develop
     ```

3. **Integração:**
   - Push da branch de feature.
   - Abra PR para `develop`.
   - Após aprovação e merge, atualize a `develop` local.

4. **Release / Deploy:**
   - Quando a `develop` estiver estável:
     ```bash
     git checkout main
     git merge develop
     npm run build  # Gera a pasta docs/
     git add docs/
     git commit -m "build: atualiza docs para GitHub Pages"
     git push origin main
     ```

## Configuração de Build (Vite)

- **Output:** `docs/` (configurado em `vite.config.ts`).
- **Base Path:** `/seq-dna-humano/` (ajustar conforme URL do GitHub Pages).
- **Comandos:**
  - `npm run dev` — Servidor de desenvolvimento.
  - `npm run build` — Gera build de produção em `docs/`.

## Limpeza e Boas Práticas

- **Remover Lixo:** Antes de commitar, verifique arquivos temporários, logs ou artefatos de build que não deveriam estar no repo.
- **.gitignore:** Certifique-se de que `node_modules/`, `dist/`, `.output/` e `docs/` (na develop) estão ignorados.
- **Commits:** Use mensagens convencionais (`feat:`, `fix:`, `chore:`, `docs:`).
- **VS Code:** Use a extensão GitLens para visualizar o fluxo de branches e histórico.

---
*Atualizado em: 2026-10-27*