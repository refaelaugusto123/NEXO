# NEXO STORE

E-commerce completo, moderno e responsivo de acessórios tecnológicos e lifestyle, com tema escuro e detalhes neon (azul, roxo e ciano).

Este projeto é uma aplicação **full-stack funcional de verdade**: frontend, backend e banco de dados reais, sem dependências externas de npm — roda com Node.js puro.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Login de administrador](#login-de-administrador)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Pagamentos (ambiente de testes)](#pagamentos-ambiente-de-testes)
- [Frete e entrega](#frete-e-entrega)
- [Programa de fidelidade](#programa-de-fidelidade)
- [Segurança e LGPD](#segurança-e-lgpd)
- [Indo para produção](#indo-para-produção)
- [Variáveis de ambiente](#variáveis-de-ambiente)

---

## Arquitetura

| Camada     | Tecnologia |
|------------|------------|
| Backend    | **Node.js puro** (módulo `http` nativo) — sem Express, sem frameworks |
| Banco de dados | **SQLite** via módulo nativo `node:sqlite` (Node ≥ 22) — arquivo local, zero configuração |
| Frontend   | HTML5 + CSS3 + **JavaScript vanilla** (sem build step, sem React/Vue) |
| Autenticação | Sessões via cookie `HttpOnly` + senha com hash `scrypt` (nativo do Node) |
| Pagamentos | Gateway simulado (sandbox) — ver seção própria |
| Frete/CEP  | API pública gratuita [ViaCEP](https://viacep.com.br) + cálculo de frete simulado |

Por que essa escolha? Para que o projeto rode em **qualquer máquina com Node.js instalado**, sem precisar de `npm install`, banco de dados externo (Postgres/MySQL) ou chaves de API pagas para ser testado imediatamente.

> Quer trocar o SQLite por Postgres/MySQL, ou o Express por outro framework? A camada de acesso a dados está isolada em `server/db.js` e as rotas em `server/routes/*.js`, o que facilita a substituição.

---

## Requisitos

- **Node.js 22 ou superior** (usa o módulo nativo `node:sqlite`, estável a partir da v22.5+)
- Não é necessário instalar nenhum pacote via `npm install` para rodar o projeto — todas as dependências usadas são nativas do Node.

Verifique sua versão:

```bash
node -v
```

---

## Instalação e execução

```bash
# 1. Entre na pasta do projeto
cd nexo-store

# 2. (Opcional) copie o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Popule o banco de dados com produtos de demonstração
npm run seed

# 4. Inicie o servidor
npm start
```

O servidor sobe em **http://localhost:3000**

- Loja: http://localhost:3000
- Painel administrativo: http://localhost:3000/admin/

Para reiniciar o banco do zero, apague o arquivo `data/nexostore.db` e rode `npm run seed` novamente.

### Modo desenvolvimento (recarrega ao salvar)

```bash
npm run dev
```

---

## Login de administrador

Um usuário administrador é criado automaticamente no primeiro `seed`:

```
E-mail: admin@nexostore.com.br
Senha:  Admin@123
```

**Troque esta senha imediatamente em qualquer ambiente real**, pelo próprio painel (`/admin/` → funcionalidade de troca de senha disponível em "Minha conta" como cliente comum; para o admin, altere diretamente no banco ou crie um fluxo de troca de senha administrativa antes de publicar).

---

## Estrutura de pastas

```
nexo-store/
├── package.json
├── .env.example
├── README.md
├── data/                      # banco de dados SQLite (gerado automaticamente)
├── scripts/
│   └── generate-placeholders.js   # gera as imagens SVG de demonstração
├── server/                    # BACKEND
│   ├── index.js               # servidor HTTP principal (roteador)
│   ├── db.js                  # conexão + schema do banco (SQLite nativo)
│   ├── auth.js                # hash de senha (scrypt), sessões
│   ├── loyalty.js             # regras do programa de fidelidade
│   ├── payment-gateway.js     # gateway de pagamento simulado (sandbox)
│   ├── shipping.js            # cálculo de frete + integração ViaCEP
│   ├── seed-data.js           # dados de demonstração (produtos, cupons, admin)
│   ├── utils.js                # helpers HTTP (body parser, cookies, static files)
│   └── routes/                # rotas da API REST
│       ├── auth.js
│       ├── products.js
│       ├── reviews.js
│       ├── coupons.js
│       ├── shipping.js
│       ├── orders.js
│       ├── users.js
│       ├── loyalty.js
│       └── admin.js
└── public/                    # FRONTEND (servido estaticamente)
    ├── index.html              # página inicial
    ├── produtos.html           # catálogo com filtros
    ├── produto.html            # detalhe do produto
    ├── carrinho.html           # carrinho completo
    ├── checkout.html           # endereço → frete → cupom → pagamento
    ├── login.html / cadastro.html
    ├── conta.html              # área do cliente (perfil, endereços, pedidos, fidelidade)
    ├── admin/                  # painel administrativo
    │   ├── index.html          # dashboard
    │   ├── produtos.html
    │   ├── pedidos.html
    │   ├── clientes.html
    │   ├── cupons.html
    │   └── fidelidade.html
    ├── css/style.css           # design system (tema dark neon)
    ├── js/                     # lógica do frontend (vanilla JS)
    └── img/products/           # imagens SVG de demonstração
```

---

## Funcionalidades implementadas

### Identidade visual
Tema escuro com gradientes neon (azul `#3b8cff`, roxo `#9b5cff`, ciano `#35e7ff`), animações de entrada (`fade-up`, `reveal on scroll`), microinterações em botões e cards, totalmente responsivo (grid adaptativo, menu mobile, drawer de carrinho).

### Página inicial
Banner principal, produtos em destaque, mais vendidos, ofertas/promoções, categorias, avaliações reais de clientes e seção de novidades — todos **puxados dinamicamente da API**, nada é hardcoded no HTML.

### Catálogo
Filtros por categoria, preço, estoque, promoção, novidades e mais vendidos; ordenação; busca por texto. Cada produto exibe imagem, nome, descrição, preço original/promocional, estoque, variações (cor/modelo) e avaliações verificadas.

### Conta de cliente
Cadastro (nome, e-mail, telefone, senha com hash seguro), login, recuperação de senha (fluxo de token), histórico de compras com rastreamento, endereços múltiplos, edição de dados pessoais e senha.

### Carrinho e checkout
Carrinho persistente (localStorage) com alteração de quantidade e subtotal automático; checkout em 3 etapas (endereço → frete → pagamento) com cupom de desconto, cálculo de frete real por CEP e simulação de pagamento (PIX, cartão, boleto) em ambiente sandbox. **O servidor sempre recalcula preços, estoque e descontos** — nunca confia em valores vindos do cliente.

### Frete e rastreamento
Consulta de CEP via ViaCEP (preenchimento automático de endereço), cálculo de frete por região/peso/valor declarado, frete grátis acima de R$ 299, e painel do cliente mostra status de entrega e código de rastreio atualizável pelo admin.

### Programa de fidelidade
5 níveis (Inicial 10% → Diamante 50%), pontuação de 1 ponto por R$ 1 em compras pagas, código de fidelidade único por cliente, regras documentadas e visíveis no painel, desconto de fidelidade nunca cumulativo com cupom (usa-se o maior).

### Avaliações
Nota de 1 a 5 estrelas, comentário obrigatório, foto opcional, selo de "compra verificada" (checado automaticamente contra pedidos pagos do cliente) e resposta do administrador. Nenhuma avaliação falsa é pré-cadastrada fora do conjunto de demonstração explicitamente marcado.

### Painel administrativo
Dashboard com métricas de vendas, CRUD completo de produtos (preço, estoque, variações, destaque), gestão de pedidos (status + rastreamento), consulta de clientes, CRUD de cupons, administração do programa de fidelidade (visão geral + ajuste manual de pontos) e relatório de vendas por dia.

### Segurança
- Senhas com hash `scrypt` + salt único por usuário (nunca texto puro)
- Sessões via token aleatório de 256 bits, cookie `HttpOnly` + `SameSite=Lax`
- Validação de formulários no cliente **e** no servidor
- Controle de permissões (rotas `/api/admin/*` exigem `is_admin = 1`)
- Proteção contra path traversal nos arquivos estáticos
- Preços e estoque sempre validados/recalculados no servidor no checkout

---

## Pagamentos (ambiente de testes)

O arquivo `server/payment-gateway.js` simula um gateway de pagamento. **Nenhuma transação real ocorre e nenhum dado de cartão é armazenado.**

- **PIX**: gera um código "copia e cola" fictício e fica com status `aguardando_pagamento`. Use o botão "Simular confirmação de pagamento" na área do cliente para confirmar manualmente.
- **Boleto**: gera um código de barras fictício com vencimento em 3 dias, mesmo fluxo de confirmação manual.
- **Cartão de crédito**: aprovado automaticamente, **exceto** se o número informado terminar em `0000` (simula recusa pela operadora).

### Para integrar um provedor real

1. Crie conta de desenvolvedor no provedor (Mercado Pago, Stripe, PagSeguro, Cielo etc.) e obtenha as chaves de API.
2. Preencha `PAYMENT_PUBLIC_KEY` / `PAYMENT_SECRET_KEY` no `.env`.
3. Substitua as funções de `server/payment-gateway.js` pelas chamadas HTTP/SDK do provedor escolhido (criar preferência de pagamento, cobrança PIX, tokenização de cartão).
4. Nunca armazene número completo de cartão, CVV ou senha de PIX no seu banco — delegue isso ao provedor (tokenização).

---

## Frete e entrega

- **Consulta de CEP**: usa a API pública e gratuita [ViaCEP](https://viacep.com.br) (`server/shipping.js`). Requer acesso à internet no servidor.
- **Cálculo de frete**: simulação baseada em região (primeiro dígito do CEP), peso total do carrinho e valor declarado (para frete grátis acima de R$ 299). Substitua por uma integração real (Correios, Melhor Envio, Frenet) alterando `calculateShippingOptions()` em `server/shipping.js`.
- **Rastreamento**: o administrador atualiza `tracking_code` e `tracking_status` pelo painel (`/admin/pedidos.html`); o cliente visualiza em tempo real na área "Meus pedidos".

---

## Programa de fidelidade

| Nível | Pontos necessários | Desconto |
|-------|--------------------|----------|
| Cliente Inicial  | 0      | 10% |
| Cliente Bronze   | 300    | 15% |
| Cliente Prata    | 800    | 20% |
| Cliente Ouro     | 2.000  | 30% |
| Cliente Diamante | 5.000  | até 50% |

**Regras** (ver também `server/loyalty.js` e a aba "Fidelidade" na conta do cliente):

1. 1 ponto a cada R$ 1,00 em compras **pagas e confirmadas**.
2. Pedidos cancelados/estornados não geram pontos.
3. O nível é definido pelo total de pontos acumulados (não expira nesta versão de demonstração).
4. O desconto incide sobre o subtotal dos produtos (não sobre o frete).
5. Desconto de fidelidade **não é cumulativo** com cupom — vale sempre o maior dos dois.
6. Cada cliente tem um código único (`NEXO-XXXXXXXX`), visível em "Minha Conta → Fidelidade".
7. O administrador pode ajustar pontos manualmente (bônus, correções) pelo painel.

---

## Segurança e LGPD

- Dados pessoais (nome, e-mail, telefone, endereços) ficam armazenados apenas no banco local da aplicação.
- Senhas nunca são armazenadas em texto puro (hash `scrypt` + salt aleatório por usuário).
- O cliente pode editar ou solicitar remoção de seus próprios dados (endpoint de exclusão de endereço já implementado; para exclusão total de conta/dados pessoais, adicione um endpoint `DELETE /api/users/me` antes de publicar em produção, conforme exigido pela LGPD para o direito ao esquecimento).
- Recomenda-se, para produção, adicionar: página de política de privacidade detalhada, registro de consentimento no cadastro, e criptografia em repouso do arquivo de banco de dados se hospedado em ambiente compartilhado.

---

## Indo para produção

Antes de publicar este projeto para uso real, ajuste:

1. **`.env`**: gere um `SESSION_SECRET` forte e aleatório; nunca reutilize o valor de exemplo.
2. **Pagamentos**: troque `server/payment-gateway.js` por uma integração real (ver seção acima).
3. **Senha do admin**: troque a senha padrão `Admin@123` imediatamente.
4. **HTTPS**: sirva a aplicação atrás de um proxy reverso (nginx/Caddy) com certificado TLS válido; o cookie de sessão já ativa o atributo `Secure` quando `NODE_ENV=production`.
5. **Banco de dados**: para alto volume, migre de SQLite para Postgres/MySQL (a camada `server/db.js` concentra toda a lógica de conexão).
6. **Backups**: configure backup periódico do arquivo `data/nexostore.db` (ou do banco de produção).
7. **E-mails transacionais**: implemente envio real de e-mail para confirmação de cadastro e recuperação de senha (atualmente o token de redefinição é retornado na resposta da API apenas para fins de demonstração).

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa e comentada. As principais:

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor HTTP (padrão `3000`) |
| `SESSION_SECRET` | Segredo usado para assinatura de tokens — troque em produção |
| `DB_PATH` | Caminho do arquivo SQLite |
| `PAYMENT_PROVIDER` | `sandbox` (padrão) ou o nome do provedor real integrado |
| `SHIPPING_PROVIDER` | `sandbox` (padrão) ou o nome da transportadora integrada |

---

Feito com 💙 para a **NEXO STORE** — tecnologia que acompanha seu ritmo.
