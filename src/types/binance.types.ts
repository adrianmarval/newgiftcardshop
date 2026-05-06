/**
 * @fileoverview Definiciones de tipos TypeScript para la integración con Binance API
 * @module BinanceAPITypes
 * @version 1.0.0
 *
 * Este módulo contiene todas las definiciones de tipos, interfaces y enumeraciones
 * necesarias para interactuar con los endpoints de retiros y transferencias de Binance.
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

/**
 * @fileoverview Tipos TypeScript para el endpoint Get Pay Trade History de Binance Pay.
 * @version 1.0.0
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
