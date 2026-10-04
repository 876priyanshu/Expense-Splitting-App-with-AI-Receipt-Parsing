const redis = require('./cache');
const { generateSettlement } = require('./settlementEngine');

const CACHE_TTL_SECONDS = 300; // 5 minutes

function getCacheKey(groupId) {
  return `settlement:${groupId}`;
}

async function getCachedSettlement(groupId, expenses, memberIds) {
  const key = getCacheKey(groupId);

  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`[cache] HIT  ${key}`);
      return { ...JSON.parse(cached), cacheHit: true };
    }
  } catch (err) {
    console.error('[cache] Redis read failed, computing directly:', err.message);
  }

  console.log(`[cache] MISS ${key} — computing`);
  const result = generateSettlement(expenses, memberIds);

  try {
    await redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    console.error('[cache] Redis write failed (non-fatal):', err.message);
  }

  return { ...result, cacheHit: false };
}

async function invalidateSettlementCache(groupId) {
  const key = getCacheKey(groupId);
  try {
    await redis.del(key);
    console.log(`[cache] INVALIDATED ${key}`);
  } catch (err) {
    console.error('[cache] Redis invalidation failed (non-fatal):', err.message);
  }
}

module.exports = { getCachedSettlement, invalidateSettlementCache };