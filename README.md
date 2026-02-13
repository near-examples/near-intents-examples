# NEAR Intents Examples

Example scripts demonstrating cross-chain token operations with [**NEAR Intents**](https://docs.near-intents.org). Two integration paths are covered:

- **1-Click API** — simple REST-based flow for cross-chain swaps (no wallet SDK required)
- **Intents SDK** — full programmatic access to deposits, swaps, transfers, and withdrawals inside the intents system

## Prerequisites

- [Node.js >= 16](https://nodejs.org/en)
- [pnpm >= 8](https://pnpm.io/)
- A NEAR account **or** an EVM wallet with a private key
- _(Optional)_ 1-Click JWT token — [request here](https://partners.near-intents.org/sign-in)
  - Without a JWT you will pay a 0.1% fee on all swaps

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/near-examples/near-intents-examples
   cd near-intents-examples
   pnpm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:

   ```env
   # 1-Click API examples (NEAR wallet only)
   SENDER_NEAR_ACCOUNT=your-account.near
   SENDER_PRIVATE_KEY=ed25519:5D9PZd2a...
   ONE_CLICK_JWT=eyJhbGciOiJSUzI1N....

   # SDK examples (NEAR or EVM — set one)
   INTENTS_SDK_PRIVATE_KEY_NEAR=ed25519:5D9PZd2a...
   INTENTS_SDK_PRIVATE_KEY_EVM=0x...
   ```

## Project Structure

```
near-intents-examples/
├── 1click-example/              # REST-based 1-Click API examples
│   ├── 1-get-tokens.ts          # Fetch supported tokens list
│   ├── 2-get-quote.ts           # Get swap quote with deposit address
│   ├── 3-send-deposit.ts        # Send tokens to deposit address
│   ├── 4-submit-tx-hash-OPTIONAL.ts  # Submit tx hash for faster processing
│   ├── 5-check-status-OPTIONAL.ts    # Poll swap status until completion
│   ├── 6-full-swap.ts           # End-to-end swap (steps 2-5 combined)
│   ├── near.ts                  # NEAR account setup
│   └── utils.ts                 # Display helpers
│
├── sdk-examples/                # Intents SDK examples (split by signer type)
│   ├── near/                    # NEAR wallet (NEP-413 signing) examples
│   │   ├── config.ts            # NEAR SDK instance, RPC provider & signer setup
│   │   ├── chains.ts            # Chain name ↔ BlockchainEnum mapping
│   │   ├── get-tokens-list.ts   # Fetch supported tokens
│   │   ├── get-internal-address.ts  # Derive intents-internal account ID
│   │   ├── get-balances.ts      # Read token balances from intents contract
│   │   ├── get-deposit-address.ts   # Get deposit address to fund intents account
│   │   ├── get-public-key.ts    # Register public key with intents.near verifier
│   │   ├── swap-tokens.ts       # Swap tokens inside intents system
│   │   ├── transfer-tokens.ts   # Internal transfer between intents accounts
│   │   └── withdraw-tokens.ts   # Withdraw tokens to external chain address
│   │
│   └── evm/                     # EVM wallet (ERC-191 signing) examples
│       ├── config.ts            # EVM SDK instance, Viem wallet client & signer setup
│       ├── chains.ts            # Chain name ↔ BlockchainEnum mapping
│       ├── get-tokens-list.ts   # Fetch supported tokens
│       ├── get-internal-address.ts  # Derive intents-internal account ID
│       ├── get-balances.ts      # Read token balances from intents contract
│       ├── get-deposit-address.ts   # Get deposit address to fund intents account
│       ├── swap-tokens.ts       # Swap tokens inside intents system
│       ├── transfer-tokens.ts   # Internal transfer between intents accounts
│       └── withdraw-tokens.ts   # Withdraw tokens to external chain address
│
├── .env.example                 # Environment variable template
└── package.json
```

## Dependencies

| Package | Purpose |
|---|---|
| [`@defuse-protocol/one-click-sdk-typescript`](https://www.npmjs.com/package/@defuse-protocol/one-click-sdk-typescript) | 1-Click REST API client (quotes, status, token list) |
| [`@defuse-protocol/intents-sdk`](https://www.npmjs.com/package/@defuse-protocol/intents-sdk) | Intents SDK for signing, submitting, and settling intents |
| [`@defuse-protocol/internal-utils`](https://www.npmjs.com/package/@defuse-protocol/internal-utils) | Auth identity, message factories, POA bridge client |
| [`near-api-js`](https://github.com/near/near-api-js) | NEAR blockchain interaction (RPC, accounts, NEP-413 signing) |
| [`viem`](https://viem.sh) | EVM wallet client and ERC-191 message signing |
| [`zod`](https://zod.dev) | Runtime response validation and type inference |
| [`@scure/base`](https://github.com/nicolo-ribaudo/scure-base) | Base64 encoding/decoding for signatures and nonces |
| [`dotenv`](https://github.com/motdotla/dotenv) | Environment variable loading |

---

## 1-Click API Examples

The 1-Click API is the simplest integration path. You request a quote, send tokens to a deposit address, and the system handles the cross-chain swap.

### Swap Flow

1. **Get quote** — receive pricing, fees, and a unique `depositAddress`
2. **Send deposit** — transfer tokens to the `depositAddress` on the origin chain
3. **Intent execution** — 1-Click handles the swap via NEAR Intents
4. _(Optional)_ Submit the tx hash for faster detection
5. _(Optional)_ Poll status until `SUCCESS` or `REFUNDED`

### Running the Examples

```bash
pnpm 1click/get-tokens        # List supported tokens (no auth required)
pnpm 1click/get-quote          # Get a swap quote
pnpm 1click/send-deposit       # Send deposit to quote address
pnpm 1click/submit-tx-hash     # Submit tx hash (optional, speeds up processing)
pnpm 1click/check-status       # Poll swap status (optional)
pnpm 1click/full-swap           # Full end-to-end swap (steps 2-5 combined)
```

### Configuring a Swap

Edit the configuration variables at the top of [`2-get-quote.ts`](./1click-example/2-get-quote.ts) or [`6-full-swap.ts`](./1click-example/6-full-swap.ts):

```ts
const isTest = true;           // true = dry run (no deposit address), false = real execution
const originAsset = 'nep141:wrap.near';                                           // Source token
const destinationAsset = 'nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near'; // Target token
const amount = NEAR.toUnits('0.5').toString();                                    // Amount in smallest unit
```

### Status Codes

| Status | Description |
|---|---|
| `PENDING_DEPOSIT` | Waiting for deposit confirmation |
| `KNOWN_DEPOSIT_TX` | Deposit transaction detected |
| `PROCESSING` | Swap being executed |
| `SUCCESS` | Swap completed |
| `REFUNDED` | Swap failed, tokens refunded |

---

## SDK Examples

The Intents SDK gives full control over the intents system. Tokens are deposited into an intents account first, then swapped, transferred, or withdrawn programmatically.

Examples are split into two folders by signer type — pick the one that matches your wallet:

### NEAR Wallet Examples (NEP-413 signing)

```bash
pnpm sdk/near/get-tokens-list       # List all supported tokens
pnpm sdk/near/get-internal-address  # Derive your intents-internal account ID
pnpm sdk/near/get-balances          # Check token balances in your intents account
pnpm sdk/near/get-deposit-address   # Get a deposit address to fund your intents account
pnpm sdk/near/get-public-key        # Register public key with intents.near verifier
pnpm sdk/near/swap-tokens           # Swap tokens inside the intents system
pnpm sdk/near/transfer-tokens       # Internal transfer to another intents account
pnpm sdk/near/withdraw-tokens       # Withdraw tokens to an external chain address
```

### EVM Wallet Examples (ERC-191 signing)

```bash
pnpm sdk/evm/get-tokens-list       # List all supported tokens
pnpm sdk/evm/get-internal-address  # Derive your intents-internal account ID
pnpm sdk/evm/get-balances          # Check token balances in your intents account
pnpm sdk/evm/get-deposit-address   # Get a deposit address to fund your intents account
pnpm sdk/evm/swap-tokens           # Swap tokens inside the intents system
pnpm sdk/evm/transfer-tokens       # Internal transfer to another intents account
pnpm sdk/evm/withdraw-tokens       # Withdraw tokens to an external chain address
```

### Typical Workflow

1. **Get your internal address** — derive the intents account ID from your NEAR or EVM credentials
2. **Get a deposit address** — request a chain-specific address to fund your intents account
3. **Deposit tokens** — send tokens from your external wallet to the deposit address
4. **Check balances** — verify tokens arrived in your intents account
5. **Swap / Transfer / Withdraw** — perform operations inside the system

---

## Learn More

- [NEAR Intents Docs](https://docs.near-intents.org)
- [1-Click API Reference](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api)
- [1-Click TypeScript SDK](https://github.com/defuse-protocol/one-click-sdk-typescript)
- [NEAR Intents Explorer](https://explorer.near-intents.org)
- [NEAR Protocol Docs](https://docs.near.org)

## Contributing

Contributions are welcome. Before submitting a PR, make sure your code passes linting:

```bash
pnpm lint        # check for issues
pnpm lint:fix    # auto-fix issues
pnpm format      # format with Prettier
```

## License

This project is provided as educational examples for the NEAR Intents ecosystem.
