/**
 * @fileoverview Definiciones de tipos para la API de transferencias universales de Binance
 * @module BinanceAPITypes/Transfer
 * @version 1.0.0
 *
 * Este módulo contiene las interfaces y tipos necesarios para interactuar
 * con el endpoint de transferencia universal de activos de Binance.
 */

import type { Asset } from './common';

/**
 * Tipos de transferencia universal soportados por Binance.
 *
 * Permite transferir activos entre diferentes tipos de cuentas dentro del ecosistema Binance:
 * - MAIN: Cuenta Spot (principal)
 * - UMFUTURE: Futuros USD-Margined
 * - CMFUTURE: Futuros Coin-Margined
 * - MARGIN: Cuenta de margen cross
 * - ISOLATEDMARGIN: Cuenta de margen aislado
 * - FUNDING: Cuenta de financiamiento
 * - OPTION: Cuenta de opciones
 * - PORTFOLIO_MARGIN: Cuenta de margen de portafolio
 *
 * @typedef {string} BinanceUniversalTransferType
 *
 * @see {@link https://binance-docs.github.io/apidocs/spot/en/#user-universal-transfer|Binance Universal Transfer API}
 *
 * @example
 * // Transferir de Spot a Futuros USD-M
 * const transferType: BinanceUniversalTransferType = 'MAIN_UMFUTURE';
 *
 * // Transferir de Margen a Spot
 * const transferType2: BinanceUniversalTransferType = 'MARGIN_MAIN';
 */
export type BinanceUniversalTransferType =
  // Transferencias desde/hacia Spot (MAIN)
  | 'MAIN_UMFUTURE' // Spot → USD-M Futures
  | 'MAIN_CMFUTURE' // Spot → COIN-M Futures
  | 'MAIN_MARGIN' // Spot → Cross Margin
  | 'MAIN_FUNDING' // Spot → Funding
  | 'MAIN_OPTION' // Spot → Options
  | 'MAIN_PORTFOLIO_MARGIN' // Spot → Portfolio Margin

  // Transferencias desde/hacia USD-M Futures (UMFUTURE)
  | 'UMFUTURE_MAIN' // USD-M Futures → Spot
  | 'UMFUTURE_MARGIN' // USD-M Futures → Cross Margin
  | 'UMFUTURE_FUNDING' // USD-M Futures → Funding
  | 'UMFUTURE_OPTION' // USD-M Futures → Options

  // Transferencias desde/hacia COIN-M Futures (CMFUTURE)
  | 'CMFUTURE_MAIN' // COIN-M Futures → Spot
  | 'CMFUTURE_MARGIN' // COIN-M Futures → Cross Margin
  | 'CMFUTURE_FUNDING' // COIN-M Futures → Funding

  // Transferencias desde/hacia Cross Margin (MARGIN)
  | 'MARGIN_MAIN' // Cross Margin → Spot
  | 'MARGIN_UMFUTURE' // Cross Margin → USD-M Futures
  | 'MARGIN_CMFUTURE' // Cross Margin → COIN-M Futures
  | 'MARGIN_ISOLATEDMARGIN' // Cross Margin → Isolated Margin
  | 'MARGIN_FUNDING' // Cross Margin → Funding
  | 'MARGIN_OPTION' // Cross Margin → Options

  // Transferencias con Isolated Margin (ISOLATEDMARGIN)
  | 'ISOLATEDMARGIN_MARGIN' // Isolated Margin → Cross Margin
  | 'ISOLATEDMARGIN_ISOLATEDMARGIN' // Entre cuentas Isolated Margin

  // Transferencias desde/hacia Funding (FUNDING)
  | 'FUNDING_MAIN' // Funding → Spot
  | 'FUNDING_UMFUTURE' // Funding → USD-M Futures
  | 'FUNDING_MARGIN' // Funding → Cross Margin
  | 'FUNDING_CMFUTURE' // Funding → COIN-M Futures
  | 'FUNDING_OPTION' // Funding → Options

  // Transferencias desde/hacia Options (OPTION)
  | 'OPTION_MAIN' // Options → Spot
  | 'OPTION_UMFUTURE' // Options → USD-M Futures
  | 'OPTION_MARGIN' // Options → Cross Margin
  | 'OPTION_FUNDING' // Options → Funding

  // Transferencias con Portfolio Margin
  | 'PORTFOLIO_MARGIN_MAIN'; // Portfolio Margin → Spot

/**
 * Parámetros requeridos para ejecutar una transferencia universal de activos en Binance.
 *
 * Endpoint asociado: `POST /sapi/v1/asset/transfer`
 *
 * La transferencia universal permite mover activos entre diferentes tipos de cuentas
 * dentro del ecosistema Binance (Spot, Futures, Margin, etc.).
 *
 * @interface BinanceUniversalTransferRequestParams
 *
 * @property {BinanceUniversalTransferType} type - Tipo de transferencia entre cuentas (obligatorio)
 * @property {Asset} asset - Activo a transferir (obligatorio)
 * @property {string} amount - Cantidad a transferir en formato string (obligatorio)
 * @property {string} [fromSymbol] - Par de trading origen para Isolated Margin
 * @property {string} [toSymbol] - Par de trading destino para Isolated Margin
 * @property {number} [recvWindow] - Ventana temporal de validez en milisegundos
 *
 * @see {@link https://binance-docs.github.io/apidocs/spot/en/#user-universal-transfer|Binance Universal Transfer API}
 *
 * @example
 * Transferir USDT de Spot a Futuros USD-M
 * const transferParams: BinanceUniversalTransferRequestParams = {
 *   type: 'MAIN_UMFUTURE',
 *   asset: 'USDT',
 *   amount: '1000.00'
 * };
 *
 * @example
 * Transferir entre Isolated Margin
 * const isolatedTransfer: BinanceUniversalTransferRequestParams = {
 *   type: 'ISOLATEDMARGIN_ISOLATEDMARGIN',
 *   asset: 'USDT',
 *   amount: '500.00',
 *   fromSymbol: 'BTCUSDT',
 *   toSymbol: 'ETHUSDT'
 * };
 */
export interface BinanceUniversalTransferRequestParams {
  /**
   * Tipo de transferencia que define las cuentas origen y destino.
   * @type {BinanceUniversalTransferType}
   * @required
   * @example 'MAIN_UMFUTURE'
   */
  type: BinanceUniversalTransferType;

  /**
   * Activo digital a transferir.
   * @type {Asset}
   * @required
   * @example 'USDT'
   */
  asset: Asset;

  /**
   * Cantidad a transferir expresada como string.
   *
   * IMPORTANTE: Se utiliza string en lugar de number para:
   * - Preservar la precisión decimal completa
   * - Evitar problemas de redondeo de punto flotante
   * - Cumplir con el formato requerido por la API de Binance
   *
   * @type {string}
   * @required
   * @example '1000.50'
   */
  amount: string;

  /**
   * Par de trading de la cuenta Isolated Margin origen.
   *
   * OBLIGATORIO cuando el tipo de transferencia es:
   * - `ISOLATEDMARGIN_MARGIN`
   * - `ISOLATEDMARGIN_ISOLATEDMARGIN`
   *
   * @type {string}
   * @optional
   * @example 'BTCUSDT'
   */
  fromSymbol?: string;

  /**
   * Par de trading de la cuenta Isolated Margin destino.
   *
   * OBLIGATORIO cuando el tipo de transferencia es:
   * - `MARGIN_ISOLATEDMARGIN`
   * - `ISOLATEDMARGIN_ISOLATEDMARGIN`
   *
   * @type {string}
   * @optional
   * @example 'ETHUSDT'
   */
  toSymbol?: string;

  /**
   * Ventana temporal de validez de la solicitud en milisegundos.
   *
   * Protección contra ataques de replay. Si el servidor recibe la solicitud
   * fuera de esta ventana temporal, será rechazada.
   *
   * @type {number}
   * @optional
   * @default 5000
   * @maximum 60000
   * @example 10000 // 10 segundos
   */
  recvWindow?: number;
}

/**
 * Respuesta retornada por Binance tras una transferencia universal exitosa.
 *
 * @interface BinanceUniversalTransferResponse
 *
 * @property {number} tranId - ID único de la transacción de transferencia
 *
 * @example
 * const response: BinanceUniversalTransferResponse = {
 *   tranId: 13526853623
 * };
 */
export interface BinanceUniversalTransferResponse {
  /**
   * Identificador único de la transacción de transferencia asignado por Binance.
   * Usar este ID para consultar el estado de la transferencia posteriormente.
   * @type {number}
   * @example 13526853623
   */
  tranId: number;
}
