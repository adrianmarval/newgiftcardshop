/**
 * @fileoverview Barrel de tipos para la integración con Binance API
 * @module BinanceAPITypes
 * @version 1.0.0
 *
 * Re-exporta todos los tipos, interfaces y enumeraciones de los módulos
 * de Binance para facilitar las importaciones.
 */

// Common — Enums, types, and shared interfaces
export {
  SupportedNetworks,
  SupportedAssets,
  type Asset,
  type Network,
  type CoinInfoResponse,
  type CoinInfo,
  type NetworkList,
} from './common';

// Withdraw — Withdrawal request/response types
export {
  type BinanceWithdrawRequestParams,
  type BinanceWithdrawResponse,
  WithdrawStatus,
  type BinanceWithdrawHistoryRequestParams,
  type BinanceWithdrawHistoryRecord,
  type BinanceWithdrawHistoryResponse,
} from './withdraw';

// Transfer — Universal transfer types
export {
  type BinanceUniversalTransferType,
  type BinanceUniversalTransferRequestParams,
  type BinanceUniversalTransferResponse,
} from './transfer';

// Convert — Quote and conversion types
export {
  type QuoteRequest,
  type QuoteResponse,
  type AcceptQuoteRequest,
  type AcceptQuoteResponse,
} from './convert';

// Pay — Binance Pay types
export {
  PayOrderType,
  PayWalletType,
  type GetPayTradeHistoryRequestParams,
  type AccountType,
  type WalletAssetCost,
  type FundDetail,
  type ExtendedInfo,
  type TradeUserInfo,
  type PayTradeHistoryRecord,
  type GetPayTradeHistoryResponse,
} from './pay';
