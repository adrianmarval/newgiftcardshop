/**
 * @fileoverview Definiciones de tipos para la API de conversión de Binance
 * @module BinanceAPITypes/Convert
 * @version 1.0.0
 *
 * Este módulo contiene las interfaces necesarias para interactuar
 * con los endpoints de cotización y conversión de Binance.
 */

import type { Asset } from './common';

/**
 * Define la estructura del cuerpo de la solicitud (payload) para obtener una cotización.
 */
export interface QuoteRequest {
  /** Token que se va a vender (ej: 'BTC'). */
  fromAsset: Asset;

  /** Token que se va a comprar (ej: 'USDT'). */
  toAsset: Asset;

  /**
   * La cantidad de 'fromAsset' que se desea vender.
   * Debe enviarse 'fromAmount' O 'toAmount', pero no ambos.
   */
  fromAmount?: string | number;

  /**
   * La cantidad de 'toAsset' que se desea recibir.
   * Debe enviarse 'fromAmount' O 'toAmount', pero no ambos.
   */
  toAmount?: string | number;

  /**
   * Tipo de billetera a usar. Por defecto es 'SPOT'.
   * Opciones: 'SPOT', 'FUNDING', 'EARN', o combinaciones como 'SPOT_FUNDING'.
   */
  walletType?: 'SPOT' | 'FUNDING' | 'EARN' | 'SPOT_FUNDING' | 'FUNDING_EARN' | 'SPOT_FUNDING_EARN' | 'SPOT_EARN';

  /**
   * Tiempo de validez de la cotización. Por defecto es '10s'.
   * Opciones: '10s', '30s', '1m'.
   */
  validTime?: '10s' | '30s' | '1m';

  /**
   * Ventana de tiempo en milisegundos (ms) para la solicitud. Máximo: 60000.
   */
  recvWindow?: number;
}

/**
 * Define la estructura de la respuesta de la API al obtener una cotización.
 */
export interface QuoteResponse {
  /** Identificador único de la cotización. */
  quoteId: string;

  /** Tasa de conversión (cuánto 'toAsset' por 1 unidad de 'fromAsset'). Ejemplo: "38163.7" */
  ratio: string;

  /** Tasa de conversión inversa (cuánto 'fromAsset' por 1 unidad de 'toAsset'). Ejemplo: "0.0000262" */
  inverseRatio: string;

  /** Marca de tiempo en milisegundos indicando hasta cuándo es válida esta cotización. */
  validTimestamp: number;

  /** Cantidad final del token 'toAsset' que se recibirá. */
  toAmount: string;

  /** Cantidad del token 'fromAsset' que se debitará. */
  fromAmount: string;
}

/**
 * Parámetros para aceptar una cotización de conversión.
 */
export interface AcceptQuoteRequest {
  /** El ID de la cotización que deseas aceptar, obtenido de getQuote. */
  quoteId: string;
  /** Opcional: Máx. 60000. */
  recvWindow?: number;
}

/**
 * Respuesta de la API al aceptar una cotización.
 */
export interface AcceptQuoteResponse {
  /** ID de la orden de conversión generada. */
  orderId: string;
  /** Marca de tiempo de la creación de la orden. */
  createTime: number;
  /** Estado de la orden: PROCESS / ACCEPT_SUCCESS / SUCCESS / FAIL. */
  orderStatus: 'PROCESS' | 'ACCEPT_SUCCESS' | 'SUCCESS' | 'FAIL';
}
