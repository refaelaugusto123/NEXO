// ===========================================
// NEXO STORE - Programa de Fidelidade
// Regras transparentes de pontuação e níveis
// ===========================================
'use strict';

// 1 ponto a cada R$ 1,00 gasto em pedidos PAGOS (confirmados). Pedidos cancelados não geram pontos.
const POINTS_PER_REAL = 1;

// Faixas de pontos acumulados (soma de todos os pedidos válidos) -> nível e desconto
// Os pontos não "resetam": o nível reflete o total de pontos válidos acumulados pelo cliente.
const TIERS = [
  { key: 'inicial', label: 'Cliente Inicial', minPoints: 0, discountPct: 10 },
  { key: 'bronze', label: 'Cliente Bronze', minPoints: 300, discountPct: 15 },
  { key: 'prata', label: 'Cliente Prata', minPoints: 800, discountPct: 20 },
  { key: 'ouro', label: 'Cliente Ouro', minPoints: 2000, discountPct: 30 },
  { key: 'diamante', label: 'Cliente Diamante', minPoints: 5000, discountPct: 50 },
];

// Regras de uso do desconto de fidelidade:
// - Aplicável a 1 pedido por vez (não cumulativo com cupom de mesmo tipo percentual mais alto - usamos o maior desconto entre cupom e fidelidade, nunca somados)
// - Validade do benefício: enquanto o cliente mantiver o nível (nível nunca cai, pois pontos não expiram nesta versão de demonstração)
// - Limite: o desconto de fidelidade não se aplica a produtos já em promoção relâmpago (campo promo_price) nesta versão de demonstração, apenas ao preço vigente normal.
const LOYALTY_RULES_TEXT = `
Regras do Programa de Fidelidade NEXO STORE:
1. A cada R$ 1,00 em compras pagas e confirmadas, você acumula 1 ponto.
2. Pedidos cancelados ou estornados não geram pontos.
3. Seu nível é definido pelo total de pontos acumulados na sua conta.
4. O desconto do seu nível é aplicado automaticamente no carrinho, incidindo sobre o subtotal dos produtos (não incide sobre o frete).
5. O desconto de fidelidade não é cumulativo com cupons promocionais: é sempre utilizado o maior desconto entre os dois.
6. Cada cliente possui um código de fidelidade único e pessoal, exibido no painel "Minha Conta".
7. Benefícios válidos enquanto a conta estiver ativa e em conformidade com os Termos de Uso da loja.
`.trim();

function getTierByPoints(points) {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (points >= tier.minPoints) current = tier;
  }
  return current;
}

function getNextTier(points) {
  const current = getTierByPoints(points);
  const idx = TIERS.findIndex((t) => t.key === current.key);
  return TIERS[idx + 1] || null;
}

function computePointsFromTotal(totalReais) {
  return Math.floor(totalReais * POINTS_PER_REAL);
}

module.exports = {
  TIERS,
  LOYALTY_RULES_TEXT,
  getTierByPoints,
  getNextTier,
  computePointsFromTotal,
};
