# NEAR Intents Cross-Chain Swap Examples

A comprehensive tutorial demonstrating cross-chain token swaps with [**NEAR Intents**](https://docs.near-intents.org) using [**1-Click API**](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api). This project provides step-by-step examples for performing seamless token swaps between different blockchains.

## 🚀 Features

- **Cross-Chain Token Swaps**: Swap tokens between NEAR, Ethereum, Arbitrum, and other supported chains
- **Step-by-Step Tutorial**: Each example focuses on a specific part of the swap process
- **Complete Integration**: Full end-to-end swap implementation
- **Real-Time Monitoring**: Track swap progress with status polling

## Prerequisites

- [pnpm >= 8](https://pnpm.io/)
- [Node.js >=16](https://nodejs.org/en)
- [TypeScript](https://www.typescriptlang.org/)
- NEAR account with sufficient balance (~0.05 $NEAR)
- 1-Click SDK JWT token -> [Request here](https://docs.google.com/forms/d/e/1FAIpQLSdrSrqSkKOMb_a8XhwF0f7N5xZ0Y5CYgyzxiAuoC2g4a2N68g/viewform) _(Optional)_
  - _(Although a JWT is not required, not using one will incur 0.1% fee on all swaps)_

## Setup

1. **Clone and Install**
   ```bash
   git clone https://github.com/near-examples/near-intents-examples
   cd near-intents-examples
   pnpm install
   ```

2. **Environment Setup**

   Create a `.env` file with your private credentials _(see [.env.example](.env.example))_:

   ```env
   SENDER_NEAR_ACCOUNT=your-account.near
   SENDER_PRIVATE_KEY=your_near_private_key
   ONE_CLICK_JWT=your_json_web_token
   ```

3. **Configure Swap**

    Swap quotes can be configured and executed independently in both [2-get-quote.ts](./1click-example/2-get-quote.ts) & [5-full-swap.ts](./1click-example/5-full-swap.ts):
   
    ```js
    // Example Swap Configuration
    const isTest = true;  // set to true for quote estimation / testing, false for actual execution
    const senderAddress = process.env.SENDER_NEAR_ACCOUNT as string;  // Configure in .env
    const recipientAddress = '0x553e771500f2d7529079918F93d86C0a845B540b';  // Token swap recipient address on Arbitrum
    const originAsset = "nep141:wrap.near";  // Native $NEAR
    const destinationAsset = "nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near";  // Native $ARB
    const amount = "100000000000000000000000";  // 0.1 $NEAR
    ```

## 🎯 Swap Flow

1. **Quote Generation**: Get token swap pricing quote with a `depositAddress`
2. **Token Deposit**: If you approve the quote, send agreed upon token amount to the `depositAddress`
3. **Intent Execution**: 1Click executes swap on specified chain(s) w/ NEAR Intents

## 📚 Tutorial Steps

Open each file _before_ executing it using the guide below. Each file has detailed comments that further educates you
about each step. Some files also have configuration options for you to alter and experiment with. 

### Step 1: Get Available Tokens

```bash
pnpm getTokens
```
Runs logic found in [1-get-tokens.ts](./1click-example/1-get-tokens.ts):
- Fetches all supported tokens across different blockchains
- No authentication required
- Displays tokens organized by blockchain
- Use `assetId` for swap quote configuration

### Step 2: Get Quote

```bash
pnpm getQuote
```
Runs logic found in [2-get-quote.ts](./1click-example/2-get-quote.ts):
- Retrieves swap quotes with pricing and fees
- Generates unique deposit addresses
- Calculates expected output amounts

### Step 3: Send Deposit

```bash
pnpm sendDeposit
```
Runs logic found in [3-send-deposit.ts](./1click-example/3-send-deposit.ts):
- Sends $NEAR tokens to the generated deposit address
- Initiates the cross-chain swap process
- Returns transaction hash for tracking

### Step 4: Check Status

```bash
pnpm checkStatus
```
Runs logic found in [4-check-status.ts](./1click-example/4-check-status.ts):
- Monitors swap execution status
- Tracks progress through different stages
- Shows completion confirmation

### Step 5: Full Swap (Complete Flow)

```bash
pnpm fullSwap
```
Runs logic found in [5-full-swap.ts](./1click-example/5-full-swap.ts):
- Combines steps 2-4 into one seamless process
- Automatic status monitoring until completion
- _(NOTE: Configure swap options in `5-full-swap.ts` independently of other files)_


## 🏗️ Project Structure

```
1click-example/
├── 1-get-tokens.ts      # Fetch supported networks and tokens
├── 2-get-quote.ts       # Get swap quotes
├── 3-send-deposit.ts    # Send deposit transaction
├── 4-check.status.ts    # Monitor swap status
├── 5-full-swap.ts       # Execute complete swap flow
├── near.ts              # NEAR account utilities
└── utils.ts             # Helper functions for formatting `getTokens` response
```

## 🔗 Dependencies

- **[@defuse-protocol/one-click-sdk-typescript](https://www.npmjs.com/package/@defuse-protocol/one-click-sdk-typescript)**: Official 1-Click SDK
- **[@near-js/*](https://github.com/near/near-api-js)**: NEAR blockchain interaction
- **dotenv**: Environment variable management
- **TypeScript**: Type-safe development


## 🔍 Status Monitoring

The system tracks swaps through these stages:
- `PENDING_DEPOSIT`: Waiting for deposit confirmation
- `KNOWN_DEPOSIT_TX`: Deposit transaction detected
- `PROCESSING`: Swap being executed
- `SUCCESS`: Swap completed successfully
- `REFUNDED`: Swap failed, tokens refunded

## 📖 Learn More

- [1-Click API Docs](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api)
- [1-Click TypeScript SDK Repo](https://github.com/defuse-protocol/one-click-sdk-typescript)
- [NEAR Intents Explorer](https://explorer.near-intents.org)
- [NEAR Protocol Documentation](https://docs.near.org)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

## 📄 License

This project is provided as educational examples for the 1-Click SDK and NEAR Intents ecosystem.
