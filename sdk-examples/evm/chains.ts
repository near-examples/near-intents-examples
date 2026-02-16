import { BlockchainEnum } from '@defuse-protocol/internal-utils';

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

/**
 *  Chain Mapping
 *
 *  Two mapping directions exist because different APIs use different identifiers:
 *   - The token list API returns human-readable chain names (e.g. "arbitrum")
 *   - The POA bridge API expects `BlockchainEnum` values (e.g. BlockchainEnum.ARBITRUM)
 *
 *  `assetNetworkAdapter`        — chain name → BlockchainEnum (for bridge calls)
 *  `reverseAssetNetworkAdapter` — BlockchainEnum → chain name (for display/lookup)
 *
 */

// Map human-readable chain names to BlockchainEnum values
export const assetNetworkAdapter: Record<SupportedChainName, BlockchainEnum> = {
  near: BlockchainEnum.NEAR,
  eth: BlockchainEnum.ETHEREUM,
  base: BlockchainEnum.BASE,
  arbitrum: BlockchainEnum.ARBITRUM,
  bitcoin: BlockchainEnum.BITCOIN,
  bitcoincash: BlockchainEnum.BITCOINCASH,
  solana: BlockchainEnum.SOLANA,
  dogecoin: BlockchainEnum.DOGECOIN,
  turbochain: BlockchainEnum.TURBOCHAIN,
  aurora: BlockchainEnum.AURORA,
  aurora_devnet: BlockchainEnum.AURORA_DEVNET,
  xrpledger: BlockchainEnum.XRPLEDGER,
  zcash: BlockchainEnum.ZCASH,
  gnosis: BlockchainEnum.GNOSIS,
  berachain: BlockchainEnum.BERACHAIN,
  tron: BlockchainEnum.TRON,
  tuxappchain: BlockchainEnum.TUXAPPCHAIN,
  vertex: BlockchainEnum.VERTEX,
  optima: BlockchainEnum.OPTIMA,
  easychain: BlockchainEnum.EASYCHAIN,
  hako: BlockchainEnum.HAKO,
  polygon: BlockchainEnum.POLYGON,
  bsc: BlockchainEnum.BSC,
  hyperliquid: BlockchainEnum.HYPERLIQUID,
  ton: BlockchainEnum.TON,
  optimism: BlockchainEnum.OPTIMISM,
  avalanche: BlockchainEnum.AVALANCHE,
  sui: BlockchainEnum.SUI,
  stellar: BlockchainEnum.STELLAR,
  aptos: BlockchainEnum.APTOS,
  cardano: BlockchainEnum.CARDANO,
  litecoin: BlockchainEnum.LITECOIN,
  layerx: BlockchainEnum.LAYERX,
  monad: BlockchainEnum.MONAD,
  plasma: BlockchainEnum.PLASMA,
  scroll: BlockchainEnum.SCROLL,
  adi: BlockchainEnum.ADI,
  starknet: BlockchainEnum.STARKNET,
};

// Reverse map: BlockchainEnum values to human-readable chain names
export const reverseAssetNetworkAdapter: Record<
  BlockchainEnum,
  SupportedChainName
> = {
  [BlockchainEnum.NEAR]: 'near',
  [BlockchainEnum.ETHEREUM]: 'eth',
  [BlockchainEnum.BASE]: 'base',
  [BlockchainEnum.ARBITRUM]: 'arbitrum',
  [BlockchainEnum.BITCOIN]: 'bitcoin',
  [BlockchainEnum.BITCOINCASH]: 'bitcoincash',
  [BlockchainEnum.SOLANA]: 'solana',
  [BlockchainEnum.DOGECOIN]: 'dogecoin',
  [BlockchainEnum.TURBOCHAIN]: 'turbochain',
  [BlockchainEnum.AURORA]: 'aurora',
  [BlockchainEnum.AURORA_DEVNET]: 'aurora_devnet',
  [BlockchainEnum.XRPLEDGER]: 'xrpledger',
  [BlockchainEnum.ZCASH]: 'zcash',
  [BlockchainEnum.GNOSIS]: 'gnosis',
  [BlockchainEnum.BERACHAIN]: 'berachain',
  [BlockchainEnum.TRON]: 'tron',
  [BlockchainEnum.TUXAPPCHAIN]: 'tuxappchain',
  [BlockchainEnum.VERTEX]: 'vertex',
  [BlockchainEnum.OPTIMA]: 'optima',
  [BlockchainEnum.EASYCHAIN]: 'easychain',
  [BlockchainEnum.HAKO]: 'hako',
  [BlockchainEnum.POLYGON]: 'polygon',
  [BlockchainEnum.BSC]: 'bsc',
  [BlockchainEnum.HYPERLIQUID]: 'hyperliquid',
  [BlockchainEnum.TON]: 'ton',
  [BlockchainEnum.OPTIMISM]: 'optimism',
  [BlockchainEnum.AVALANCHE]: 'avalanche',
  [BlockchainEnum.SUI]: 'sui',
  [BlockchainEnum.STELLAR]: 'stellar',
  [BlockchainEnum.APTOS]: 'aptos',
  [BlockchainEnum.CARDANO]: 'cardano',
  [BlockchainEnum.LITECOIN]: 'litecoin',
  [BlockchainEnum.LAYERX]: 'layerx',
  [BlockchainEnum.MONAD]: 'monad',
  [BlockchainEnum.PLASMA]: 'plasma',
  [BlockchainEnum.SCROLL]: 'scroll',
  [BlockchainEnum.ADI]: 'adi',
  [BlockchainEnum.STARKNET]: 'starknet',
};