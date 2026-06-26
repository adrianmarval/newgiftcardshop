/**
 * @fileoverview Definiciones de tipos para la API de Binance Pay
 * @module BinanceAPITypes/Pay
 * @version 1.0.0
 *
 * Este módulo contiene las interfaces y enumeraciones necesarias para
 * interactuar con los endpoints de historial de transacciones de Binance Pay.
 */

/**
 * Tipos de transacción de pago soportados por Binance Pay.
 *
 * @enum {string}
 * @readonly
 */
export enum PayOrderType {
  /** C2B Merchant Acquiring Payment (Pago de Consumidor a Negocio) */
  PAY = 'PAY',

  /** PAY, refund (Reembolso de Pago C2B) */
  PAY_REFUND = 'PAY_REFUND',

  /** C2C Transfer Payment (Transferencia de Consumidor a Consumidor) */
  C2C = 'C2C',

  /** Crypto box (Caja Cripto) */
  CRYPTO_BOX = 'CRYPTO_BOX',

  /** Crypto Box, refund (Reembolso de Caja Cripto) */
  CRYPTO_BOX_RF = 'CRYPTO_BOX_RF',

  /** Transfer to new Binance user (Transferencia a nuevo usuario Binance) */
  C2C_HOLDING = 'C2C_HOLDING',

  /** Transfer to new Binance user, refund (Reembolso de Transferencia a nuevo usuario) */
  C2C_HOLDING_RF = 'C2C_HOLDING_RF',

  /** B2C Disbursement Payment (Pago de Desembolso de Negocio a Consumidor) */
  PAYOUT = 'PAYOUT',

  /** Send cash (Envío de efectivo) */
  REMITTANCE = 'REMITTANCE',
}

/**
 * Tipos de billetera principal para un registro de transacción de pago.
 *
 * @enum {number}
 * @readonly
 */
export enum PayWalletType {
  /** Billetera Funding (Financiamiento) */
  FUNDING = 1,

  /** Billetera Spot (Comercio) */
  SPOT = 2,

  /** Billetera Fiat */
  FIAT = 3,

  /** Pago con Tarjeta (Tipo 4 o 6) */
  CARD_PAYMENT_4 = 4,

  /** Billetera Earn (Ganancias) */
  EARN = 5,

  /** Pago con Tarjeta (Tipo 4 o 6) */
  CARD_PAYMENT_6 = 6,
}

/**
 * Parámetros de la solicitud GET para el historial de transacciones de pago.
 *
 * Endpoint asociado: `GET /sapi/v1/pay/transactions`
 *
 * @interface GetPayTradeHistoryRequestParams
 *
 * @property {number} [startTime] - Timestamp de inicio en milisegundos (UTC).
 * @property {number} [endTime] - Timestamp de fin en milisegundos (UTC).
 * @property {number} [limit] - Cantidad máxima de registros a retornar.
 * @property {number} [recvWindow] - Ventana temporal de validez en milisegundos.
 *
 * @example
 * const params: GetPayTradeHistoryRequestParams = {
 * startTime: new Date('2024-01-01').getTime(),
 * limit: 50,
 * timestamp: Date.now()
 * };
 */
export interface GetPayTradeHistoryRequestParams {
  /**
   * Timestamp de inicio del rango de búsqueda en milisegundos (UTC).
   * @type {number}
   * @optional
   * @example 1704067200000 // 2024-01-01 00:00:00 UTC
   */
  startTime?: number;

  /**
   * Timestamp de fin del rango de búsqueda en milisegundos (UTC).
   *
   * NOTA: El intervalo máximo entre startTime y endTime es de 90 días.
   * Si no se envían, se devuelven los últimos 90 días.
   * @type {number}
   * @optional
   * @example 1706745599999 // 2024-01-31 23:59:59 UTC
   */
  endTime?: number;

  /**
   * Cantidad máxima de registros a retornar.
   * @type {number}
   * @optional
   * @default 100
   * @maximum 100
   * @example 50
   */
  limit?: number;

  /**
   * Ventana temporal de validez de la solicitud en milisegundos.
   * @type {number}
   * @optional
   * @default 5000
   * @maximum 60000
   */
  recvWindow?: number;
}

// --- Interfaces de Respuesta (Response) ---

/**
 * Tipo de cuenta del usuario/entidad de pago.
 *
 * @typedef {'USER' | 'MERCHANT'} AccountType
 */
export type AccountType = 'USER' | 'MERCHANT';

/**
 * Detalle del costo de un activo por billetera en una transacción.
 * La clave es el tipo de billetera (`PayWalletType`), el valor es el monto como `string`.
 *
 * @typedef WalletAssetCost
 * @example [{ "1": "0.6" }, { "2": "0.6" }] // 0.6 de la billetera 1 (Funding) y 0.6 de la billetera 2 (Spot)
 */
export type WalletAssetCost = { [key in PayWalletType]?: string }[];

/**
 * Estructura de detalle de fondos utilizados en la transacción.
 *
 * @interface FundDetail
 *
 * @property {string} currency - Activo (criptomoneda) utilizado.
 * @property {string} amount - Cantidad del activo utilizada.
 * @property {WalletAssetCost} walletAssetCost - Detalle del costo del activo por billetera.
 */
export interface FundDetail {
  /**
   * Activo (criptomoneda) utilizado.
   * @type {string}
   * @example 'USDT'
   */
  currency: string;

  /**
   * Cantidad del activo utilizada.
   * Expresado como string para preservar precisión decimal.
   * @type {string}
   * @example '1.2'
   */
  amount: string;

  /**
   * Detalles del costo del activo por billetera.
   * @type {WalletAssetCost}
   */
  walletAssetCost: WalletAssetCost;
}

/**
 * Campo de extensión para información adicional, especialmente en `REMITTANCE`.
 *
 * @interface ExtendedInfo
 *
 * @property {string} institutionName - Nombre de la institución financiera (ej: para REMITTANCE).
 * @property {string} cardNumber - Número de tarjeta (ej: para REMITTANCE).
 * @property {string} digitalWalletId - ID de la billetera digital (ej: para REMITTANCE).
 */
export interface ExtendedInfo {
  institutionName: string;
  cardNumber: string;
  digitalWalletId: string;
}

/**
 * Información del pagador (payerInfo) o receptor (receiverInfo).
 * Los campos presentes dependen del `orderType` y la perspectiva (emisor/receptor).
 *
 * @interface TradeUserInfo
 *
 * @property {string} name - Apodo o nombre del comerciante.
 * @property {AccountType} type - Tipo de cuenta ('USER' o 'MERCHANT').
 * @property {string} [binanceId] - ID de usuario de Binance (UID).
 * @property {string} [email] - Correo electrónico.
 * @property {string} [accountId] - Binance Pay ID.
 * @property {string} [countryCode] - Código de área internacional.
 * @property {string} [phoneNumber] - Número de teléfono.
 * @property {string} [mobileCode] - Código de país móvil.
 * @property {ExtendedInfo} [extend] - Campos de extensión adicionales.
 */
export interface TradeUserInfo {
  /**
   * Apodo o nombre del comerciante.
   * @type {string}
   */
  name: string;

  /**
   * Tipo de cuenta: USER para personal, MERCHANT para comerciante.
   * @type {AccountType}
   */
  type: AccountType;

  /**
   * ID de usuario de Binance (UID).
   * @type {string}
   * @optional
   */
  binanceId?: string;

  /**
   * Correo electrónico.
   * @type {string}
   * @optional
   */
  email?: string;

  /**
   * Binance Pay ID.
   * @type {string}
   * @optional
   */
  accountId?: string;

  /**
   * Código de área internacional.
   * @type {string}
   * @optional
   */
  countryCode?: string;

  /**
   * Número de teléfono.
   * @type {string}
   * @optional
   */
  phoneNumber?: string;

  /**
   * Código de país móvil.
   * @type {string}
   * @optional
   */
  mobileCode?: string;

  /**
   * Campo de extensión para información adicional (ej: REMITTANCE).
   * @type {ExtendedInfo}
   * @optional
   */
  extend?: ExtendedInfo;
}

/**
 * Registro individual de una transacción de pago en el historial.
 *
 * @interface PayTradeHistoryRecord
 */
export interface PayTradeHistoryRecord {
  /**
   * ID de usuario de Binance de la cuenta que realizó la consulta.
   * @type {number}
   */
  uid: number;

  /**
   * ID de la contraparte de la transacción.
   * @type {number}
   */
  counterpartyId: number;

  /**
   * ID de la orden de pago.
   * @type {string}
   */
  orderId: string;

  /**
   * Nota o descripción de la transacción.
   * @type {string}
   */
  note: string;

  /**
   * Tipo de transacción de pago.
   * @type {PayOrderType}
   * @example 'C2C'
   */
  orderType: PayOrderType;

  /**
   * ID único de la transacción.
   * @type {string}
   */
  transactionId: string;

  /**
   * Timestamp de la transacción en milisegundos (UTC).
   * @type {number}
   */
  transactionTime: number;

  /**
   * Monto de la orden. Positivo = **ingreso**, negativo = **egreso**.
   * @type {string}
   * @example '21.12'
   */
  amount: string;

  /**
   * Moneda de la transacción (ej: 'USDT').
   * @type {string}
   */
  currency: string;

  /**
   * Tipo de billetera principal (`PayWalletType`).
   * @type {PayWalletType}
   */
  walletType: PayWalletType;

  /**
   * Tipos de billetera utilizados (como `string` IDs).
   * @type {string[]}
   * @example ['1']
   */
  walletTypes: string[];

  /**
   * Detalles de los fondos utilizados (activos y su costo por billetera).
   * @type {FundDetail[]}
   */
  fundsDetail: FundDetail[];

  /**
   * Información del pagador.
   * @type {TradeUserInfo}
   */
  payerInfo: TradeUserInfo;

  /**
   * Información del receptor.
   * @type {TradeUserInfo}
   */
  receiverInfo: TradeUserInfo;

  /**
   * Comisión total del pago.
   * @type {string}
   * @example '0'
   */
  totalPaymentFee: string;
}

/**
 * Respuesta completa del endpoint de historial de transacciones de pago.
 *
 * @interface GetPayTradeHistoryResponse
 *
 * @property {string} code - Código de resultado de la operación ('000000' para éxito).
 * @property {string} message - Mensaje descriptivo del resultado ('success').
 * @property {PayTradeHistoryRecord[]} data - Array de registros de transacciones.
 * @property {boolean} success - Indicador booleano de éxito de la solicitud.
 */
export interface GetPayTradeHistoryResponse {
  /**
   * Código de resultado de la operación.
   * @type {string}
   * @example '000000'
   */
  code: string;

  /**
   * Mensaje descriptivo del resultado.
   * @type {string}
   * @example 'success'
   */
  message: string;

  /**
   * Array de registros de transacciones de pago.
   * @type {PayTradeHistoryRecord[]}
   */
  data: PayTradeHistoryRecord[];

  /**
   * Indicador booleano de éxito de la solicitud.
   * @type {boolean}
   * @example true
   */
  success: boolean;
}
