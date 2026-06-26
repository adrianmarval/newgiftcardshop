/**
 * @fileoverview Definiciones de tipos para la API de retiros de Binance
 * @module BinanceAPITypes/Withdraw
 * @version 1.0.0
 *
 * Este módulo contiene las interfaces y enumeraciones necesarias
 * para interactuar con los endpoints de retiros de Binance.
 */

import type { Asset, Network } from './common';

/**
 * Parámetros requeridos para ejecutar una solicitud de retiro en Binance.
 *
 * Endpoint asociado: `POST /sapi/v1/capital/withdraw/apply`
 *
 * @interface BinanceWithdrawRequestParams
 *
 * @property {Asset} coin - Activo digital a retirar (obligatorio)
 * @property {string} [withdrawOrderId] - Identificador personalizado del retiro para tracking
 * @property {Network} [network] - Red blockchain a utilizar para la transacción
 * @property {string} address - Dirección de destino en la blockchain (obligatorio)
 * @property {string} [addressTag] - Memo, tag o payment ID para redes que lo requieren
 * @property {string} amount - Cantidad a retirar en formato string para precisión decimal (obligatorio)
 * @property {boolean} [transactionFeeFlag] - Si true, deduce comisión de cuenta destino en transferencias internas
 * @property {string} [name] - Etiqueta descriptiva para la dirección de retiro
 * @property {0 | 1} [walletType] - Tipo de billetera: 0=Spot, 1=Funding
 * @property {number} [recvWindow] - Ventana temporal de validez en milisegundos
 *
 * @see {@link https://binance-docs.github.io/apidocs/spot/en/#withdraw-user_data|Binance Withdraw API}
 *
 * @example
 * const withdrawParams: BinanceWithdrawRequestParams = {
 *   coin: 'USDT',
 *   network: 'BSC',
 *   address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
 *   amount: '100.50',
 *   withdrawOrderId: 'WITHDRAW_20240109_001',
 *   walletType: 0,
 *   recvWindow: 5000
 * };
 */
export interface BinanceWithdrawRequestParams {
  /**
   * Activo digital a retirar.
   * @type {Asset}
   * @required
   * @example 'USDT'
   */
  coin: Asset;

  /**
   * Identificador único personalizado para el retiro.
   * Permite rastrear la operación con una referencia propia en consultas posteriores.
   * @type {string}
   * @optional
   * @maxLength 100
   * @example 'WITHDRAW_20240109_001'
   */
  withdrawOrderId?: string;

  /**
   * Red blockchain a utilizar para la transacción.
   * Si no se especifica, Binance seleccionará la red por defecto del activo.
   * @type {Network}
   * @optional
   * @example 'BSC'
   */
  network?: Network;

  /**
   * Dirección de destino en la blockchain.
   * Debe ser una dirección válida para la red seleccionada.
   * @type {string}
   * @required
   * @example '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
   */
  address: string;

  /**
   * Identificador secundario requerido por algunas redes.
   * Conocido como: Memo (XLM), Tag (XRP), Payment ID (XMR), etc.
   * @type {string}
   * @optional
   * @example '123456789'
   */
  addressTag?: string;

  /**
   * Cantidad a retirar expresada como string.
   *
   * IMPORTANTE: Se utiliza string en lugar de number para:
   * - Preservar la precisión decimal completa
   * - Evitar problemas de redondeo de punto flotante
   * - Cumplir con el formato requerido por la API de Binance
   *
   * @type {string}
   * @required
   * @example '100.50'
   */
  amount: string;

  /**
   * Determina quién paga la comisión en transferencias internas.
   *
   * - `true`: La comisión se deduce de la cuenta de destino
   * - `false` (default): La comisión se deduce de la cuenta origen
   *
   * Solo aplica para transferencias entre cuentas dentro de Binance.
   * @type {boolean}
   * @optional
   * @default false
   */
  transactionFeeFlag?: boolean;

  /**
   * Etiqueta o descripción personalizada para la dirección.
   * Útil para identificar el propósito o destinatario del retiro.
   * @type {string}
   * @optional
   * @maxLength 50
   * @example 'Pago a proveedor ABC'
   */
  name?: string;

  /**
   * Tipo de billetera desde la cual se realizará el retiro.
   *
   * - `0`: Billetera Spot (trading)
   * - `1`: Billetera Funding (financiamiento)
   *
   * Si no se especifica, usa la billetera seleccionada actualmente.
   * @type {0 | 1}
   * @optional
   */
  walletType?: 0 | 1;

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
 * Respuesta retornada por Binance tras una solicitud exitosa de retiro.
 *
 * @interface BinanceWithdrawResponse
 *
 * @property {string} id - ID único de la transacción asignado por Binance
 *
 * @example
 * const response: BinanceWithdrawResponse = {
 *   id: '7213fea8e94b4a5593d507237e5a555b'
 * };
 */
export interface BinanceWithdrawResponse {
  /**
   * Identificador único de la transacción de retiro asignado por Binance.
   * Usar este ID para consultar el estado del retiro posteriormente.
   * @type {string}
   * @example '7213fea8e94b4a5593d507237e5a555b'
   */
  id: string;
}

/**
 * Estados posibles de un retiro en Binance.
 *
 * @enum {number}
 * @readonly
 *
 * @example
 * const status = WithdrawStatus.COMPLETED;
 * console.log(status); // 6
 */
export enum WithdrawStatus {
  /** Email de confirmación enviado al usuario */
  EMAIL_SENT = 0,

  /** Retiro cancelado por el usuario o sistema */
  CANCELLED = 1,

  /** Retiro pendiente de aprobación manual */
  AWAITING_APPROVAL = 2,

  /** Retiro rechazado por el equipo de Binance */
  REJECTED = 3,

  /** Retiro en proceso de ejecución */
  PROCESSING = 4,

  /** Retiro fallido por error técnico o validación */
  FAILURE = 5,

  /** Retiro completado exitosamente */
  COMPLETED = 6,
}

/**
 * Parámetros para consultar el historial de retiros en Binance.
 *
 * Endpoint asociado: `GET /sapi/v1/capital/withdraw/history`
 *
 * Permite obtener el historial de retiros realizados con filtros opcionales
 * por moneda, estado, rango de fechas y más.
 *
 * @interface BinanceWithdrawHistoryRequestParams
 *
 * @property {Asset} [coin] - Filtrar por activo específico
 * @property {string} [withdrawOrderId] - ID personalizado del retiro
 * @property {WithdrawStatus} [status] - Filtrar por estado del retiro
 * @property {number} [offset] - Número de registros a omitir para paginación
 * @property {number} [limit] - Cantidad máxima de registros a retornar
 * @property {string} [idList] - Lista de IDs de retiro separados por coma
 * @property {number} [startTime] - Timestamp de inicio en milisegundos
 * @property {number} [endTime] - Timestamp de fin en milisegundos
 * @property {number} [recvWindow] - Ventana temporal de validez en milisegundos
 * @property {number} timestamp - Timestamp actual en milisegundos (obligatorio)
 *
 * @see {@link https://binance-docs.github.io/apidocs/spot/en/#withdraw-history-supporting-network-user_data|Binance Withdraw History API}
 *
 * @example
 * Consultar últimos retiros de USDT completados
 * const params: BinanceWithdrawHistoryRequestParams = {
 *   coin: 'USDT',
 *   status: WithdrawStatus.COMPLETED,
 *   limit: 50,
 *   timestamp: Date.now()
 * };
 *
 * @example
 * Consultar retiros en un rango de fechas
 * const params: BinanceWithdrawHistoryRequestParams = {
 *   startTime: new Date('2024-01-01').getTime(),
 *   endTime: new Date('2024-01-31').getTime(),
 *   limit: 100,
 *   timestamp: Date.now()
 * };
 */
export interface BinanceWithdrawHistoryRequestParams {
  /**
   * Activo digital para filtrar el historial.
   * Si no se especifica, retorna retiros de todos los activos.
   * @type {Asset}
   * @optional
   * @example 'USDT'
   */
  coin?: Asset;

  /**
   * ID personalizado del retiro proporcionado en la solicitud original.
   * Si se envía este parámetro, el rango entre startTime y endTime
   * debe ser menor a 7 días.
   * @type {string}
   * @optional
   * @example 'WITHDRAW_20240109_001'
   */
  withdrawOrderId?: string;

  /**
   * Estado del retiro para filtrar resultados.
   * Usar el enum WithdrawStatus para valores válidos.
   * @type {WithdrawStatus}
   * @optional
   * @example WithdrawStatus.COMPLETED
   */
  status?: WithdrawStatus;

  /**
   * Número de registros a omitir (para paginación).
   * @type {number}
   * @optional
   * @default 0
   * @example 100
   */
  offset?: number;

  /**
   * Cantidad máxima de registros a retornar.
   * @type {number}
   * @optional
   * @default 1000
   * @maximum 1000
   * @example 50
   */
  limit?: number;

  /**
   * Lista de IDs de retiro separados por comas.
   * Los IDs son retornados por el endpoint de aplicación de retiro.
   *
   * IMPORTANTE: Máximo 45 IDs permitidos.
   * @type {string}
   * @optional
   * @maxItems 45
   * @example 'b6ae22b3aa844210a7041aee7589627c,156ec387f49b41df8724fa744fa82719'
   */
  idList?: string;

  /**
   * Timestamp de inicio del rango de búsqueda en milisegundos (UTC).
   *
   * RESTRICCIONES:
   * - Por defecto: últimos 90 días desde el timestamp actual
   * - Si se envía con endTime, la diferencia debe ser menor a 90 días
   * - Si se envía con withdrawOrderId, la diferencia debe ser menor a 7 días
   *
   * @type {number}
   * @optional
   * @example 1704067200000 // 2024-01-01 00:00:00 UTC
   */
  startTime?: number;

  /**
   * Timestamp de fin del rango de búsqueda en milisegundos (UTC).
   *
   * RESTRICCIONES:
   * - Por defecto: timestamp actual
   * - Si se envía con startTime, la diferencia debe ser menor a 90 días
   * - Si se envía con withdrawOrderId, la diferencia debe ser menor a 7 días
   *
   * @type {number}
   * @optional
   * @example 1706745599999 // 2024-01-31 23:59:59 UTC
   */
  endTime?: number;

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
 * Registro individual de un retiro en el historial.
 *
 * Contiene toda la información detallada sobre una transacción de retiro,
 * incluyendo estado, montos, direcciones y metadata asociada.
 *
 * @interface BinanceWithdrawHistoryRecord
 *
 * @property {string} id - ID único del retiro en Binance
 * @property {string} amount - Cantidad retirada
 * @property {string} transactionFee - Comisión de la transacción
 * @property {string} coin - Activo retirado
 * @property {WithdrawStatus} status - Estado actual del retiro
 * @property {string} address - Dirección de destino
 * @property {string} txId - ID de la transacción en la blockchain
 * @property {string} applyTime - Fecha y hora de solicitud (UTC)
 * @property {Network} [network] - Red blockchain utilizada
 * @property {0 | 1} transferType - Tipo de transferencia
 * @property {string} [withdrawOrderId] - ID personalizado del retiro
 * @property {string} info - Información adicional o razón de falla
 * @property {number} confirmNo - Número de confirmaciones requeridas
 * @property {0 | 1} walletType - Tipo de billetera origen
 * @property {string} txKey - Clave de transacción adicional
 * @property {string} [completeTime] - Fecha y hora de completado (UTC)
 *
 * @example
 * const record: BinanceWithdrawHistoryRecord = {
 *   id: "b6ae22b3aa844210a7041aee7589627c",
 *   amount: "100.50000000",
 *   transactionFee: "0.50",
 *   coin: "USDT",
 *   status: 6,
 *   address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
 *   txId: "0xb5ef8c13b968a406cc62a93a8bd80f9e9a906ef1b3fcf20a2e48573c17659268",
 *   applyTime: "2024-01-09 10:30:00",
 *   network: "BSC",
 *   transferType: 0,
 *   info: "",
 *   confirmNo: 15,
 *   walletType: 0,
 *   txKey: "",
 *   completeTime: "2024-01-09 10:35:00"
 * };
 */
export interface BinanceWithdrawHistoryRecord {
  /**
   * Identificador único del retiro asignado por Binance.
   * @type {string}
   * @example 'b6ae22b3aa844210a7041aee7589627c'
   */
  id: string;

  /**
   * Cantidad total retirada (sin incluir comisión).
   * Expresado como string para preservar precisión decimal.
   * @type {string}
   * @example '100.50000000'
   */
  amount: string;

  /**
   * Comisión cobrada por la transacción de retiro.
   * Expresado como string para preservar precisión decimal.
   * @type {string}
   * @example '0.50'
   */
  transactionFee: string;

  /**
   * Activo digital que fue retirado.
   * @type {string}
   * @example 'USDT'
   */
  coin: string;

  /**
   * Estado actual del retiro.
   * @type {WithdrawStatus}
   * @example 6 // COMPLETED
   */
  status: WithdrawStatus;

  /**
   * Dirección de destino en la blockchain.
   * @type {string}
   * @example '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
   */
  address: string;

  /**
   * ID de la transacción en la blockchain (hash).
   * @type {string}
   * @example '0xb5ef8c13b968a406cc62a93a8bd80f9e9a906ef1b3fcf20a2e48573c17659268'
   */
  txId: string;

  /**
   * Fecha y hora de solicitud del retiro en formato UTC.
   * @type {string}
   * @format 'YYYY-MM-DD HH:mm:ss'
   * @example '2024-01-09 10:30:00'
   */
  applyTime: string;

  /**
   * Red blockchain utilizada para el retiro.
   *
   * NOTA: Puede no estar presente en retiros antiguos.
   * @type {Network}
   * @optional
   * @example 'BSC'
   */
  network?: Network;

  /**
   * Tipo de transferencia del retiro.
   *
   * - `0`: Transferencia externa (a dirección fuera de Binance)
   * - `1`: Transferencia interna (entre cuentas de Binance)
   *
   * @type {0 | 1}
   * @example 0
   */
  transferType: 0 | 1;

  /**
   * ID personalizado del retiro definido por el cliente.
   *
   * NOTA: Solo presente si se proporcionó en la solicitud original.
   * @type {string}
   * @optional
   * @example 'WITHDRAW_20240109_001'
   */
  withdrawOrderId?: string;

  /**
   * Información adicional o razón de falla del retiro.
   *
   * - Vacío si el retiro fue exitoso
   * - Contiene mensaje descriptivo si hubo problemas
   *
   * @type {string}
   * @example 'The address is not valid. Please confirm with the recipient'
   */
  info: string;

  /**
   * Número de confirmaciones requeridas en la blockchain.
   *
   * Indica cuántas confirmaciones de bloque se necesitan para que
   * la transacción sea considerada final.
   *
   * @type {number}
   * @example 15
   */
  confirmNo: number;

  /**
   * Tipo de billetera desde donde se realizó el retiro.
   *
   * - `0`: Billetera Spot (trading)
   * - `1`: Billetera Funding (financiamiento)
   *
   * @type {0 | 1}
   * @example 0
   */
  walletType: 0 | 1;

  /**
   * Clave de transacción adicional (si aplica).
   *
   * Campo reservado para información técnica adicional.
   * Generalmente vacío.
   *
   * @type {string}
   * @example ''
   */
  txKey: string;

  /**
   * Fecha y hora de completado del retiro en formato UTC.
   *
   * NOTA: Solo presente cuando status = 6 (COMPLETED).
   * Indica el momento exacto en que el activo fue deducido de la cuenta.
   *
   * @type {string}
   * @optional
   * @format 'YYYY-MM-DD HH:mm:ss'
   * @example '2024-01-09 10:35:00'
   */
  completeTime?: string;
}

/**
 * Respuesta del endpoint de historial de retiros.
 *
 * Retorna un array de registros de retiros ordenados cronológicamente,
 * filtrados según los parámetros de búsqueda proporcionados.
 *
 * @typedef {BinanceWithdrawHistoryRecord[]} BinanceWithdrawHistoryResponse
 *
 * @example
 * const history: BinanceWithdrawHistoryResponse = [
 *   {
 *     id: "b6ae22b3aa844210a7041aee7589627c",
 *     amount: "100.50000000",
 *     transactionFee: "0.50",
 *     coin: "USDT",
 *     status: 6,
 *     address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
 *     txId: "0xb5ef8c13b968a406cc62a93a8bd80f9e9a906ef1b3fcf20a2e48573c17659268",
 *     applyTime: "2024-01-09 10:30:00",
 *     network: "BSC",
 *     transferType: 0,
 *     withdrawOrderId: "WITHDRAW_20240109_001",
 *     info: "",
 *     confirmNo: 15,
 *     walletType: 0,
 *     txKey: "",
 *     completeTime: "2024-01-09 10:35:00"
 *   }
 * ];
 */
export type BinanceWithdrawHistoryResponse = BinanceWithdrawHistoryRecord[];
