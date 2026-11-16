// ===========================================
// NEXO STORE - Rotas de frete/CEP
// ===========================================
'use strict';

const { sendJson, sendError, getQuery, parseBody } = require('../utils');
const shippingLib = require('../shipping');

async function getCep(req, res, cep) {
  const result = await shippingLib.lookupCep(cep);
  if (result.error) return sendError(res, 400, result.error);
  sendJson(res, 200, result);
}

async function quoteShipping(req, res) {
  const body = await parseBody(req);
  const { cep, total_weight_kg, declared_value } = body;
  const result = shippingLib.calculateShippingOptions({
    cep,
    totalWeightKg: Number(total_weight_kg) || 0.5,
    declaredValue: Number(declared_value) || 0,
  });
  if (result.error) return sendError(res, 400, result.error);
  sendJson(res, 200, result);
}

module.exports = { getCep, quoteShipping };
