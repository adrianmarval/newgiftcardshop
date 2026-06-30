// ─────────────────────────────────────────────────────────────────────────────
// Coin & Network — Entity types
// ─────────────────────────────────────────────────────────────────────────────

export interface Coin {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
}

export interface BlockchainNetwork {
  id: string;
  name: string;
  description: string;
  regex: string;
  isActive: boolean;
}

export interface CoinNetwork {
  id: string;
  coinId: string;
  networkId: string;
}

export interface CoinWithNetworks extends Coin {
  networks: (CoinNetwork & { network: BlockchainNetwork })[];
}

export interface NetworkWithCoins extends BlockchainNetwork {
  coins: (CoinNetwork & { coin: Coin })[];
}
