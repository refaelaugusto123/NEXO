// ===========================================
// NEXO STORE - Gateway de Pagamento (SANDBOX / SIMULADO)
// ===========================================
// Este módulo simula um provedor de pagamentos para fins de demonstração e
// desenvolvimento. Nenhuma transação real é realizada e nenhum dado de cartão
// é armazenado.
//
// PARA INTEGRAR UM PROVEDOR REAL (Mercado Pago, Stripe, PagSeguro, etc.):
//   1. Crie uma conta de desenvolvedor no provedor escolhido e obtenha as
//      chaves de API (pública e secreta).
//   2. Preencha PAYMENT_PUBLIC_KEY / PAYMENT_SECRET_KEY no arquivo .env
//   3. Substitua as funções abaixo pelas chamadas ao SDK/HTTP do provedor
//      (ex.: criar preferência de pagamento, criar cobrança PIX, tokenizar cartão).
//   4. Nunca armazene número completo de cartão, CVV ou senha do PIX no seu banco.
'use strict';

const crypto = require('node:crypto');

function generatePixPayload(orderNumber, amount) {
  // Simula um "copia e cola" de PIX (não é um payload EMV válido, apenas demonstrativo)
  const code = `00020126NEXOSTORE${orderNumber}5204000053039865406${amount.toFixed(2)}5802BR5913NEXO STORE6009SAO PAULO62070503***6304${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  return code;
}

function generateBoletoCode() {
  // Código de barras fictício no padrão de 47 dígitos (apenas para demonstração)
  const seg = () => Math.floor(Math.random() * 1e11).toString().padStart(11, '0');
  return `${seg()}.${seg().slice(0,6)} ${seg().slice(0,6)} ${seg().slice(0,6)} 1 ${seg()}`;
}

/**
 * Simula o processamento de um pagamento.
 * method: 'pix' | 'credit_card' | 'boleto'
 * Retorna { status, reference, extra }
 */
function processPayment({ method, amount, orderNumber, card }) {
  const reference = `SANDBOX-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  if (method === 'pix') {
    return {
      status: 'aguardando_pagamento', // no sandbox, PIX fica "aguardando" até simular confirmação
      reference,
      extra: {
        pix_copia_cola: generatePixPayload(orderNumber, amount),
        expira_em_minutos: 30,
      },
    };
  }

  if (method === 'boleto') {
    const vencimento = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10);
    return {
      status: 'aguardando_pagamento',
      reference,
      extra: {
        codigo_barras: generateBoletoCode(),
        vencimento,
      },
    };
  }

  if (method === 'credit_card') {
    // Simulação simples: números de cartão terminados em "0000" -> recusado, demais -> aprovado
    const cardNumber = (card && card.number) ? card.number.replace(/\s/g, '') : '';
    const approved = !cardNumber.endsWith('0000');
    return {
      status: approved ? 'pago' : 'recusado',
      reference,
      extra: {
        bandeira: detectCardBrand(cardNumber),
        parcelas: (card && card.installments) || 1,
        mensagem: approved ? 'Pagamento aprovado (ambiente de testes)' : 'Pagamento recusado pela operadora (simulação)',
      },
    };
  }

  return { status: 'recusado', reference, extra: { mensagem: 'Método de pagamento inválido' } };
}

function detectCardBrand(number) {
  if (/^4/.test(number)) return 'Visa';
  if (/^5[1-5]/.test(number)) return 'Mastercard';
  if (/^3[47]/.test(number)) return 'American Express';
  if (/^6(?:011|5)/.test(number)) return 'Elo/Discover';
  return 'Desconhecida';
}

module.exports = { processPayment };
