import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeEnergyDelta,
  createPublisherTopicPattern,
  normalizeReadingId,
  parseMeterTopic,
} from './utils.js'

test('createPublisherTopicPattern scopes publishing to wallet topics', () => {
  assert.equal(
    createPublisherTopicPattern('0xAbCDEF0000000000000000000000000000000000'),
    'kwhu/meters/0xabcdef0000000000000000000000000000000000/+/renewable',
  )
})

test('parseMeterTopic extracts wallet and meter id', () => {
  const parsed = parseMeterTopic(
    'kwhu/meters/0xabcdef0000000000000000000000000000000000/0x1111111111111111111111111111111111111111111111111111111111111111/renewable',
  )

  assert.equal(parsed.sellerWallet, '0xabcdef0000000000000000000000000000000000')
  assert.equal(
    parsed.meterId,
    '0x1111111111111111111111111111111111111111111111111111111111111111',
  )
})

test('computeEnergyDelta supports baseline and increasing readings', () => {
  assert.deepEqual(computeEnergyDelta(null, 1000n), {
    deltaWh: 0n,
    isBaseline: true,
  })

  assert.deepEqual(computeEnergyDelta(1000n, 1450n), {
    deltaWh: 450n,
    isBaseline: false,
  })
})

test('computeEnergyDelta rejects non-monotonic readings', () => {
  assert.throws(() => computeEnergyDelta(1000n, 1000n), /Non-monotonic/)
  assert.throws(() => computeEnergyDelta(1000n, 999n), /Non-monotonic/)
})

test('normalizeReadingId hashes non-bytes32 reading ids', () => {
  const readingId = normalizeReadingId('reading-123')
  assert.match(readingId, /^0x[a-f0-9]{64}$/)
})
