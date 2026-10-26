/**
 * Módulo de integração com GitHub REST API para edição de conteúdo.
 * Permite salvar alterações no script.json diretamente do teleprompter
 * usando um Personal Access Token (PAT) armazenado em localStorage.
 *
 * Segurança: O PAT nunca é enviado para servidores terceiros,
 * apenas para api.github.com via HTTPS.
 */

const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = 'rubenslyra';
const REPO_NAME = 'seq-dna-humano';
const SCRIPT_PATH = 'src/lib/presenter/script.json';
const BRANCH = 'main';

// Chave segura para localStorage (prefixo evita colisão)
const PAT_STORAGE_KEY = 'seq-dna-github-pat';

export interface GitHubCommitResult {
  success: boolean;
  sha?: string;
  message?: string;
  error?: string;
}

/**
 * Salva o PAT no localStorage do navegador.
 * O token é armazenado localmente e nunca transmitido exceto para api.github.com.
 */
export function saveGitHubPAT(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PAT_STORAGE_KEY, token.trim());
}

/**
 * Recupera o PAT salvo no localStorage.
 * Retorna null se não houver token configurado.
 */
export function getGitHubPAT(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PAT_STORAGE_KEY);
}

/**
 * Remove o PAT do localStorage (logout).
 */
export function clearGitHubPAT(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PAT_STORAGE_KEY);
}

/**
 * Verifica se há um PAT configurado.
 */
export function hasGitHubPAT(): boolean {
  return getGitHubPAT() !== null;
}

/**
 * Obtém o SHA atual do arquivo script.json no repositório.
 * Necessário para fazer commits via Contents API (evita conflitos).
 */
async function getFileSHA(token: string): Promise<string> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SCRIPT_PATH}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Falha ao obter SHA do arquivo: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.sha;
}

/**
 * Salva o conteúdo do script.json via GitHub Contents API.
 *
 * Fluxo:
 * 1. Obtém SHA atual do arquivo (obrigatório para update)
 * 2. Codifica novo conteúdo em base64
 * 3. Envia PUT com mensagem de commit descritiva
 *
 * @param newContent Objeto JSON completo do script
 * @param commitMessage Mensagem opcional do commit
 */
export async function saveScriptToGitHub(
  newContent: unknown,
  commitMessage?: string
): Promise<GitHubCommitResult> {
  const token = getGitHubPAT();
  if (!token) {
    return {
      success: false,
      error: 'Token de acesso não configurado. Configure nas configurações do teleprompter.',
    };
  }

  try {
    // Passo 1: Obter SHA atual
    const sha = await getFileSHA(token);

    // Passo 2: Codificar conteúdo em base64
    const jsonStr = JSON.stringify(newContent, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));

    // Passo 3: Commit via Contents API
    const message = commitMessage || `chore: atualiza roteiro via teleprompter (${new Date().toLocaleString('pt-BR')})`;

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SCRIPT_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: encoded,
          sha,
          branch: BRANCH,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return {
        success: false,
        error: `Erro ao salvar: ${response.status} - ${err}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      sha: data.content?.sha,
      message: data.commit?.message,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Erro desconhecido ao salvar.',
    };
  }
}

/**
 * Valida se o PAT tem permissões adequadas testando acesso ao repo.
 * Útil para feedback imediato na UI de configuração.
 */
export async function validateGitHubPAT(token?: string): Promise<{ valid: boolean; error?: string }> {
  const pat = token || getGitHubPAT();
  if (!pat) return { valid: false, error: 'Token não fornecido.' };

  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (response.status === 401) {
      return { valid: false, error: 'Token inválido ou expirado.' };
    }
    if (response.status === 403) {
      return { valid: false, error: 'Token não tem permissão de escrita neste repositório.' };
    }
    if (!response.ok) {
      return { valid: false, error: `Erro: ${response.status}` };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Falha de conexão.' };
  }
}