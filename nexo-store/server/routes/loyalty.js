// ===========================================
// NEXO STORE - Rotas do programa de fidelidade
// ===========================================
'use strict';

const db = require('../db');
const loyaltyLib = require('../loyalty');
const { sendJson, sendError } = require('../utils');

async function getMyLoyalty(req, res, user) {
  if (!user) return sendError(res, 401, 'Não autenticado.');

  const tier = loyaltyLib.getTierByPoints(user.loyalty_points);
  const nextTier = loyaltyLib.getNextTier(user.loyalty_points);
  const events = db.prepare('SELECT * FROM loyalty_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(user.id);

  sendJson(res, 200, {
    loyalty_code: user.loyalty_code,
    points: user.loyalty_points,
    tier: { key: tier.key, label: tier.label, discount_pct: tier.discountPct },
    next_tier: nextTier ? { key: nextTier.key, label: nextTier.label, discount_pct: nextTier.discountPct, points_needed: nextTier.minPoints - user.loyalty_points } : null,
    all_tiers: loyaltyLib.TIERS.map(t => ({ key: t.key, label: t.label, min_points: t.minPoints, discount_pct: t.discountPct })),
    rules: loyaltyLib.LOYALTY_RULES_TEXT,
    history: events,
  });
}

module.exports = { getMyLoyalty };
