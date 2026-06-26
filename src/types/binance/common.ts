/**
 * @fileoverview Definiciones de tipos comunes para la integración con Binance API
 * @module BinanceAPITypes/Common
 * @version 1.0.0
 *
 * Este módulo contiene los tipos base, enumeraciones y estructuras compartidas
 * utilizadas en los distintos módulos de la integración con Binance.
 */

/**
 * Redes blockchain soportadas por la plataforma Binance.
 *
 * @enum {string}
 * @readonly
 *
 * @example
 * const network = SupportedNetworks.BSC;
 * console.log(network); // 'BSC'
 */
export enum SupportedNetworks {
  /** Binance Smart Chain */
  BSC = 'BSC',

  /** Red Tron con estándar de token TRC20 */
  TRX = 'Tron (TRC20)',

  /** Red Polygon Proof of Stake */
  MATIC = 'Polygon POS',

  /** Cadena C de Avalanche */
  AVAXC = 'AVAX C-Chain',

  //**  */
  PLASMA = 'Plasma',

  //** Litecoin network */
  LTC = 'Litecoin',
}

/**
 * Activos digitales soportados por el sistema.
 *
 * @enum {string}
 * @readonly
 *
 * @example
 * const asset = SupportedAssets.USDT;
 * console.log(asset); // 'USDT'
 */
export enum SupportedAssets {
  /** Tether - Stablecoin vinculado al dólar estadounidense */
  USDT = 'USDT',

  /** Litecoin - Criptomoneda peer-to-peer */
  LTC = 'LTC',
}

/**
 * Tipo de dato que representa las claves válidas del enum SupportedAssets.
 * Permite trabajar con los identificadores de activos de forma type-safe.
 *
 * @typedef {keyof typeof SupportedAssets} Asset
 *
 * @example
 * const myAsset: Asset = 'USDT'; // ✓ Válido
 * const invalid: Asset = 'BTC';  // ✗ Error de TypeScript
 */
export type Asset = keyof typeof SupportedAssets;

/**
 * Tipo de dato que representa las claves válidas del enum SupportedNetworks.
 * Garantiza que solo se utilicen identificadores de redes blockchain soportadas.
 *
 * @typedef {keyof typeof SupportedNetworks} Network
 *
 * @example
 * const myNetwork: Network = 'BSC';    // ✓ Válido
 * const invalid: Network = 'SOLANA';   // ✗ Error de TypeScript
 */
export type Network = keyof typeof SupportedNetworks;

export type CoinInfoResponse = CoinInfo[];

export interface CoinInfo {
  coin: string;
  depositAllEnable: boolean;
  withdrawAllEnable: boolean;
  name: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  ipoing: string;
  ipoable: string;
  storage: string;
  isLegalMoney: boolean;
  trading: boolean;
  networkList: NetworkList[];
}

export interface NetworkList {
  network: string;
  coin: string;
  withdrawIntegerMultiple: string;
  isDefault: boolean;
  depositEnable: boolean;
  withdrawEnable: boolean;
  depositDesc: string;
  withdrawDesc: string;
  specialTips: string;
  specialWithdrawTips: string;
  name: string;
  resetAddressStatus: boolean;
  addressRegex: string;
  memoRegex: string;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  withdrawInternalMin: string;
  depositDust: string;
  minConfirm: number;
  unLockConfirm: number;
  sameAddress: boolean;
  withdrawTag: boolean;
  estimatedArrivalTime: number;
  busy: boolean;
  contractAddressUrl: string;
  contractAddress: string;
  denomination: number;
}
