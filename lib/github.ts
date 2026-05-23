/**
 * lib/github.ts — GitHub REST helpers used by the dashboard.
 *
 * All write helpers take a PAT scoped to the user's bot fork. The PAT is
 * decrypted from Clerk privateMetadata just-in-time by each API route —
 * we never store unencrypted tokens server-side.
 *
 * setRepoSecret() does REAL libsodium sealed-box encryption (the GitHub
 * Secrets API will reject anything else). This is the cornerstone fix
 * for the original audit's B1/B3 issue.
 */

import _sodium from 'libsodium-wrappers'

const GH_BASE = 'https://api.github.com'

async function sodiumReady() {
  await _sodium.ready
  return _sodium
}

async function ghFetch<T = any>(path: string, pat: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    let msg = res.statusText
    try { msg = (await res.json()).message ?? msg } catch {}
    throw new Error(`GitHub ${res.status}: ${msg}`)
  }
  if (res.status === 204) return {} as T
  // Tolerate non-JSON responses (rare).
  const text = await res.text()
  try { return JSON.parse(text) as T } catch { return text as unknown as T }
}

/** Verify the PAT works and return the authenticated login. */
export async function getGitHubUser(pat: string): Promise<string> {
  const data = await ghFetch<{ login: string }>('/user', pat)
  return data.login
}

/** List repos the PAT can access. */
export async function listAccessibleRepos(pat: string) {
  return ghFetch<any[]>('/user/repos?per_page=100&sort=updated&type=all', pat)
}

/**
 * Push a single secret to a repo's Actions secrets store, encrypted with
 * the repo's libsodium public key (GitHub's required scheme).
 */
export async function setRepoSecret(
  pat: string,
  owner: string,
  repo: string,
  secretName: string,
  secretValue: string,
): Promise<void> {
  const sodium = await sodiumReady()
  const keyData = await ghFetch<{ key: string; key_id: string }>(
    `/repos/${owner}/${repo}/actions/secrets/public-key`,
    pat,
  )
  // GitHub's docs require base64(crypto_box_seal(value, repo_pub_key)).
  const repoPubKey  = sodium.from_base64(keyData.key, sodium.base64_variants.ORIGINAL)
  const messageBin  = sodium.from_string(secretValue)
  const encryptedBin = sodium.crypto_box_seal(messageBin, repoPubKey)
  const encrypted    = sodium.to_base64(encryptedBin, sodium.base64_variants.ORIGINAL)

  await ghFetch(`/repos/${owner}/${repo}/actions/secrets/${secretName}`, pat, {
    method: 'PUT',
    body: JSON.stringify({ encrypted_value: encrypted, key_id: keyData.key_id }),
  })
}

/** Push every secret the bot needs. Throws on first failure. */
export async function pushBotSecrets(
  pat: string,
  owner: string,
  repo: string,
  values: { kalshiKeyId: string; kalshiPem: string; supabaseUrl?: string; supabaseKey?: string },
) {
  await setRepoSecret(pat, owner, repo, 'KALSHI_API_KEY',     values.kalshiKeyId)
  await setRepoSecret(pat, owner, repo, 'KALSHI_PRIVATE_KEY', values.kalshiPem)
  if (values.supabaseUrl) await setRepoSecret(pat, owner, repo, 'SUPABASE_URL', values.supabaseUrl)
  if (values.supabaseKey) await setRepoSecret(pat, owner, repo, 'SUPABASE_KEY', values.supabaseKey)
}

/** Trigger the bot workflow. */
export async function dispatchBotWorkflow(
  pat: string,
  owner: string,
  repo: string,
  mode: 'paper' | 'live' = 'paper',
) {
  await ghFetch(`/repos/${owner}/${repo}/actions/workflows/bot.yml/dispatches`, pat, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', inputs: { mode } }),
  })
}

/** Most recent workflow run (or null). */
export async function getLatestWorkflowRun(pat: string, owner: string, repo: string) {
  const data = await ghFetch<{ workflow_runs: any[] }>(
    `/repos/${owner}/${repo}/actions/workflows/bot.yml/runs?per_page=1`,
    pat,
  )
  return data.workflow_runs?.[0] ?? null
}

export async function cancelWorkflowRun(pat: string, owner: string, repo: string, runId: number) {
  await ghFetch(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`, pat, { method: 'POST' })
}

/** Read a file from the user's repo. Returns null on 404. */
export async function getRepoFile(
  pat: string,
  owner: string,
  repo: string,
  filePath: string,
): Promise<string | null> {
  try {
    const data = await ghFetch<{ content?: string; encoding?: string }>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
      pat,
    )
    if (!data || !data.content) return null
    const buf = Buffer.from(data.content, (data.encoding as BufferEncoding) || 'base64')
    return buf.toString('utf8')
  } catch (err: any) {
    if (/GitHub 404/.test(err.message)) return null
    throw err
  }
}

/** Sanity-check the PAT scope before we try to write secrets. */
export async function validatePatForRepo(pat: string, owner: string, repo: string) {
  // Hitting the actions/secrets endpoint with a GET tells us if Actions+Secrets scope is present.
  // 404 is also possible if the repo has never had a secret — try the public-key endpoint instead.
  try {
    await ghFetch(`/repos/${owner}/${repo}/actions/secrets/public-key`, pat)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}
