# O Grande Salto — Genoma Humano

[![Deploy to GitHub Pages](https://github.com/rubenslyra/seq-dna-humano/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/rubenslyra/seq-dna-humano/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

Deck animado e teleprompter interativo sobre o Projeto Genoma Humano, com controle por gestos via MediaPipe e suporte a apresentação assistida.

## ✨ Funcionalidades

- **Deck Animado:** Apresentação de slides com transições suaves e navegação por teclado
- **Teleprompter:** Modo de leitura com velocidade e tamanho de fonte ajustáveis
- **Controle por Gestos:** Navegação hands-free usando MediaPipe Hands (câmera)
- **Apoio de Fala:** Assistente para geração de respostas contextualizadas por slide
- **Endpoint API:** `/api/teleprompter-script` para integração com tablets e dispositivos externos
- **100% Estático:** Compatível com GitHub Pages, sem dependência de servidores ou serviços externos

## 🚀 Desenvolvimento Local

### Pré-requisitos

- Node.js >= 20
- npm ou yarn

### Instalação

```bash
git clone https://github.com/rubenslyra/seq-dna-humano.git
cd seq-dna-humano
npm install
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção (estático) |
| `npm run preview` | Preview do build localmente |
| `npm run lint` | Verifica código com ESLint |
| `npm run format` | Formata código com Prettier |
| `npm test` | Executa testes unitários |

## 📦 Deploy no GitHub Pages

O deploy é automático via GitHub Actions ao fazer push na branch `main`.

**URL:** [https://rubenslyra.github.io/seq-dna-humano/](https://rubenslyra.github.io/seq-dna-humano/)

### Configuração Manual (se necessário)

1. Acesse **Settings → Pages** no repositório
2. Em **Source**, selecione **GitHub Actions**
3. O workflow `.github/workflows/deploy-pages.yml` cuida do resto

## 🔒 Segurança

Este projeto é **100% client-side** em produção:

- ✅ Nenhuma variável de ambiente sensível necessária
- ✅ Sem dependência de Supabase, Lovable ou serviços externos
- ✅ Sem banco de dados ou autenticação server-side
- ✅ Build estático seguro para hospedagem pública
- ✅ Controle por gestos roda inteiramente no navegador

> ⚠️ O endpoint `/api/presenter` (assistente IA) requer runtime Node.js e não funciona no GitHub Pages. Use apenas em ambientes com servidor (Cloudflare Pages, Vercel, etc.).

## 🎮 Controles

### Teclado (Deck e Teleprompter)

| Tecla | Ação |
|-------|------|
| `←` / `→` | Slide anterior / próximo |
| `Espaço` | Play / Pause (teleprompter) |
| `↑` / `↓` | Velocidade +/- (teleprompter) |

### Gestos (Câmera)

1. Clique em **"Gestos"** na barra de navegação
2. Configure sensibilidade, intervalo e espelhamento no modal
3. Permita acesso à câmera quando solicitado
4. Deslize a mão horizontalmente para navegar

> 💡 Os gestos funcionam em HTTPS ou localhost. A câmera nunca envia vídeo para servidores — todo processamento é local via MediaPipe.

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── deck/           # Componentes da apresentação
│   ├── teleprompter/   # Controles de gesto e UI
│   └── ui/             # Componentes base (Radix + Tailwind)
├── lib/
│   ├── presenter/      # Lógica do assistente de fala
│   └── teleprompter/   # Hook de gestos e áudio sintético
├── routes/
│   ├── index.tsx       # Deck principal (/)
│   ├── teleprompter.tsx # Modo teleprompter (/teleprompter)
│   └── api/            # Endpoints (teleprompter-script, presenter)
└── styles.css          # Tailwind + tema customizado
```

## 📄 Licença

MIT © Rubens Lyra