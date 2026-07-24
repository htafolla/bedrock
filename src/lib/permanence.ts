/**
 * Permanence layer — IPFS document pin + on-chain content-hash anchor (Sui preferred).
 * Phase 1 ships interfaces + deterministic local hashing; live pin/tx require env keys.
 * Field names may still say "base*" for schema stability until the Sui registry ships.
 */

export interface PermanenceRecord {
  /** SHA-256 hex of canonical JSON document */
  contentHash: string
  /** IPFS CID when pinned */
  ipfsCid: string | null
  /** Base transaction hash when anchored */
  baseAnchorTx: string | null
  /** Unix ms */
  anchoredAt: number | null
  chain: 'base'
}

export interface PermanenceAdapter {
  hashDocument(canonicalJson: string): Promise<string>
  pinToIpfs?(canonicalJson: string): Promise<string>
  anchorOnBase?(contentHash: string, ipfsCid: string): Promise<string>
}

/** Browser-safe SHA-256 hex. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function createLocalPermanenceAdapter(): PermanenceAdapter {
  return {
    async hashDocument(canonicalJson: string) {
      return sha256Hex(canonicalJson)
    },
  }
}

/**
 * Canonicalize for hashing: stable key order via JSON parse + sorted stringify.
 * Callers should pass the BedrockDocument object or already-canonical string.
 */
export function canonicalizeDocument(value: unknown): string {
  return stableStringify(value)
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const body = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')
  return `{${body}}`
}

export async function buildPermanenceRecord(
  document: unknown,
  adapter: PermanenceAdapter = createLocalPermanenceAdapter(),
): Promise<PermanenceRecord> {
  const canonical = canonicalizeDocument(document)
  const contentHash = await adapter.hashDocument(canonical)
  let ipfsCid: string | null = null
  let baseAnchorTx: string | null = null
  let anchoredAt: number | null = null

  if (adapter.pinToIpfs) {
    ipfsCid = await adapter.pinToIpfs(canonical)
  }
  if (adapter.anchorOnBase && ipfsCid) {
    baseAnchorTx = await adapter.anchorOnBase(contentHash, ipfsCid)
    anchoredAt = Date.now()
  }

  return {
    contentHash,
    ipfsCid,
    baseAnchorTx,
    anchoredAt,
    chain: 'base',
  }
}

/** Explorer link helper for Base mainnet (or Base Sepolia via env later). */
export function baseTxExplorerUrl(txHash: string, network: 'base' | 'base-sepolia' = 'base'): string {
  const host = network === 'base-sepolia' ? 'sepolia.basescan.org' : 'basescan.org'
  return `https://${host}/tx/${txHash}`
}
