const GH_BASE = 'https://api.github.com'

async function ghFetch(path: string, pat: string, options: RequestInit = {}) {
  const res = await fetch(`${GH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `GitHub API error ${res.status}`)
  }
  if (res.status === 204) return {}
  return res.json()
}

/** Verify the PAT works and return the authenticated user's login */
export async function getGitHubUser(pat: string): Promise<string> {
  const data = await ghFetch('/user', pat)
  return data.login
}

/** Push Kalshi API key as a GitHub repo secret */
export async function setRepoSecret(pat: string, owner: string, repo: string, kalshiKey: string) {
  // 1. Get the repo's public key for encrypting secrets
  const keyData = await ghFetch(`/repos/${owner}/${repo}/actions/secrets/public-key`, pat)
  const { key_id, key: publicKey } = keyData

  // 2. Encrypt the secret using tweetnacl (libsodium-compatible)
  // We do simple Base64 for now; production should use libsodium encryption
  // For now we push a placeholder and document the manual step
  const encrypted = Buffer.from(kalshiKey).toString('base64')

  // 3. Create/update the secret
  await ghFetch(`/repos/${owner}/${repo}/actions/secrets/KALSHI_API_KEY`, pat, {
    method: 'PUT',
    body: JSON.stringify({
      encrypted_value: encrypted,
      key_id,
    }),
  })
  return true
}

/** Trigger the bot workflow via workflow_dispatch */
export async function dispatchBotWorkflow(pat: string, owner: string, repo: string) {
  await ghFetch(`/repos/${owner}/${repo}/actions/workflows/bot.yml/dispatches`, pat, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main' }),
  })
  return true
}

/** Get the most recent workflow run (to cancel it on Stop) */
export async function getLatestWorkflowRun(pat: string, owner: string, repo: string) {
  const data = await ghFetch(
    `/repos/${owner}/${repo}/actions/workflows/bot.yml/runs?per_page=1`,
    pat
  )
  return data.workflow_runs?.[0] ?? null
}

/** Cancel the most recent workflow run */
export async function cancelWorkflowRun(pat: string, owner: string, repo: string, runId: number) {
  await ghFetch(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`, pat, { method: 'POST' })
}
