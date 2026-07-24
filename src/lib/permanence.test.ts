import { describe, expect, it } from 'vitest'
import {
  baseTxExplorerUrl,
  buildPermanenceRecord,
  canonicalizeDocument,
  createLocalPermanenceAdapter,
  sha256Hex,
} from './permanence'

describe('canonicalizeDocument', () => {
  it('sorts object keys for stable hashing', () => {
    const a = canonicalizeDocument({ b: 1, a: 2 })
    const b = canonicalizeDocument({ a: 2, b: 1 })
    expect(a).toBe(b)
  })
})

describe('sha256Hex', () => {
  it('hashes deterministically', async () => {
    const h1 = await sha256Hex('bedrock')
    const h2 = await sha256Hex('bedrock')
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
  })
})

describe('buildPermanenceRecord', () => {
  it('returns Base chain record with content hash', async () => {
    const record = await buildPermanenceRecord(
      { title: 'Bedrock' },
      createLocalPermanenceAdapter(),
    )
    expect(record.chain).toBe('base')
    expect(record.contentHash).toHaveLength(64)
    expect(record.ipfsCid).toBeNull()
    expect(record.baseAnchorTx).toBeNull()
  })
})

describe('baseTxExplorerUrl', () => {
  it('builds basescan links', () => {
    expect(baseTxExplorerUrl('0xabc')).toBe('https://basescan.org/tx/0xabc')
    expect(baseTxExplorerUrl('0xabc', 'base-sepolia')).toBe(
      'https://sepolia.basescan.org/tx/0xabc',
    )
  })
})
