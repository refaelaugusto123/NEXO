// ===========================================
// NEXO STORE - Frete e Entrega
// ===========================================
// Consulta de endereço: usa a API pública gratuita ViaCEP (https://viacep.com.br)
// Cálculo de frete: simulação baseada na região do CEP + peso (substitua por
// integração real com Correios / Melhor Envio / Frenet quando for para produção).
'use strict';

async function lookupCep(cep) {
  const clean = String(cep).replace(/\D/g, '');
  if (clean.length !== 8) {
    return { error: 'CEP inválido. Informe 8 dígitos.' };
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return { error: 'CEP não encontrado.' };
    return {
      cep: data.cep,
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
    };
  } catch (err) {
    return { error: 'Não foi possível consultar o CEP agora. Verifique sua conexão com a internet e tente novamente.' };
  }
}

// Regiões simplificadas por faixa de CEP (primeiro dígito)
const REGION_BY_FIRST_DIGIT = {
  0: 'Sudeste (SP capital/interior)',
  1: 'Sudeste (SP interior)',
  2: 'Sudeste (RJ/ES)',
  3: 'Sudeste (MG)',
  4: 'Nordeste (BA/SE)',
  5: 'Nordeste (PE/AL/PB/RN)',
  6: 'Norte/Nordeste (CE/PI/MA/Norte)',
  7: 'Centro-Oeste/DF',
  8: 'Sul (PR/SC)',
  9: 'Sul (RS)',
};

function calculateShippingOptions({ cep, totalWeightKg = 0.5, declaredValue = 0 }) {
  const clean = String(cep).replace(/\D/g, '');
  if (clean.length !== 8) return { error: 'CEP inválido.' };

  const firstDigit = Number(clean[0]);
  const region = REGION_BY_FIRST_DIGIT[firstDigit] || 'Outra região';

  // Distância simulada (0 = mesma região do CD em SP (dígito 0/1), até 9 = mais distante)
  const distanceFactor = 1 + Math.min(Math.abs(firstDigit - 1), 6) * 0.18;

  const baseEconomico = 14.9;
  const baseExpresso = 24.9;

  const weightCost = Math.max(0, totalWeightKg - 0.3) * 6.5;
  const insurance = declaredValue * 0.004;

  const economico = +(baseEconomico * distanceFactor + weightCost + insurance).toFixed(2);
  const expresso = +(baseExpresso * distanceFactor + weightCost * 1.2 + insurance).toFixed(2);

  const diasEconomico = Math.round(4 + distanceFactor * 2.2);
  const diasExpresso = Math.max(1, Math.round(2 + distanceFactor * 0.9));

  const freeShippingEligible = declaredValue >= 299;

  return {
    region,
    options: [
      {
        id: 'economico',
        name: 'NEXO Entrega Econômica',
        price: freeShippingEligible ? 0 : economico,
        original_price: economico,
        days: diasEconomico,
        free: freeShippingEligible,
      },
      {
        id: 'expresso',
        name: 'NEXO Entrega Expressa',
        price: expresso,
        original_price: expresso,
        days: diasExpresso,
        free: false,
      },
    ],
  };
}

module.exports = { lookupCep, calculateShippingOptions };
