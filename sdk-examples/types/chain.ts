/**
 *  Chain Type Definitions
 *
 *  Type-safe chain name unions used across the SDK examples for
 *  deposit address lookups and chain mapping.
 *
 */

export type SupportedChainName =
  | 'eth'
  | 'near'
  | 'base'
  | 'arbitrum'
  | 'bitcoin'
  | 'bitcoincash'
  | 'solana'
  | 'dogecoin'
  | 'xrpledger'
  | 'zcash'
  | 'gnosis'
  | 'berachain'
  | 'tron'
  | 'polygon'
  | 'bsc'
  | 'ton'
  | 'optimism'
  | 'avalanche'
  | 'sui'
  | 'stellar'
  | 'aptos'
  | 'cardano'
  | 'litecoin'
  | 'layerx'
  | 'monad'
  | 'adi'
  | 'starknet'
  | 'plasma'
  | 'scroll'
  | VirtualChains
  | MockedChains;

export type VirtualChains =
  | 'turbochain'
  | 'tuxappchain'
  | 'vertex'
  | 'optima'
  | 'easychain'
  | 'hako'
  | 'aurora'
  | 'aurora_devnet';

export type MockedChains = 'hyperliquid';

export type SupportedBridge =
  | 'direct'
  | 'poa'
  | 'aurora_engine'
  | 'hot_omni'
  | 'near_omni';
