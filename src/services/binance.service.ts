import { createHmac } from 'crypto';

import type {
  AcceptQuoteRequest,
  AcceptQuoteResponse,
  Asset,
  BinanceUniversalTransferRequestParams,
  BinanceUniversalTransferResponse,
  BinanceWithdrawHistoryRequestParams,
  BinanceWithdrawHistoryResponse,
  BinanceWithdrawRequestParams,
  BinanceWithdrawResponse,
  GetPayTradeHistoryRequestParams,
  Network,
  QuoteRequest,
  QuoteResponse,
  GetPayTradeHistoryResponse,
  CoinInfoResponse,
} from '@/types/';
import { Decimal } from '@/generated/prisma/internal/prismaNamespace';

/* ----------------------------- ENV VALIDATION ----------------------------- */

const API_KEY = process.env.BINANCE_API_KEY;
const API_SECRET = process.env.BINANCE_API_SECRET;

/* ----------------------------- AGENT CONFIG ----------------------------- */

const BASE_URL = 'https://api.binance.com';

/* ----------------------------- MAIN CLASS ----------------------------- */

class BinanceService {
  private cachedServerTime = 0;
  private cacheTTL = 1000;

  constructor() {}

  /* -------------------------- INTERNAL UTILITIES -------------------------- */

  private async getServerTime(): Promise<number> {
    const now = Date.now();
    if (now - this.cachedServerTime < this.cacheTTL) return this.cachedServerTime;

    const response = await fetch(`${BASE_URL}/api/v3/time`);
    if (!response.ok) {
      throw new Error(`Failed to fetch server time: ${response.statusText}`);
    }
    const data = await response.json();

    this.cachedServerTime = data.serverTime;
    return data.serverTime;
  }

  private createSignature(queryString: string): string {
    if (!API_SECRET) throw new Error('Binance API Secret is not configured');
    return createHmac('sha256', API_SECRET).update(queryString).digest('hex');
  }

  private handleError(err: any, context: string): never {
    if (err && err.isFetchError) {
      const msg = err.data?.msg || err.response?.statusText || err.message;
      const code = err.data?.code || err.response?.status;
      console.error(`❌ BinanceService Error (${context}):`, { code, msg });
      const apiError = new Error(`Binance error (${context}): ${msg}`);
      (apiError as any).isBinanceApiError = true;
      throw apiError;
    }
    console.error(`❌ Unexpected Error (${context}):`, err);
    const genericError = err instanceof Error ? err : new Error(String(err));
    (genericError as any).isNetworkError = true;
    throw genericError;
  }

  /* -------------------------- SIGNED REQUESTS -------------------------- */

  private async sendSignedRequest<T>(method: 'GET' | 'POST', endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      if (!API_KEY) throw new Error('Binance API Key is not configured');
      const timestamp = await this.getServerTime();
      // Aseguramos que 'recvWindow' se incluya si es necesario,
      // aunque es mejor gestionarlo en los métodos públicos.
      const queryParams = { ...params, timestamp: timestamp.toString() };
      const query = new URLSearchParams(queryParams).toString();
      const signature = this.createSignature(query);

      const url = `${BASE_URL}${endpoint}?${query}&signature=${signature}`;

      const response = await fetch(url, {
        method,
        headers: { 'X-MBX-APIKEY': API_KEY },
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (!response.ok) {
        throw { isFetchError: true, response, data };
      }

      return data;
    } catch (err) {
      this.handleError(err, endpoint);
    }
  }

  /* -------------------------- BALANCES -------------------------- */

  /** Obtiene el balance libre de USDT en Spot */
  public async getSpotUsdtBalance(): Promise<string> {
    // 💡 CORRECCIÓN: Migramos a una llamada firmada manual
    try {
      const resp = await this.sendSignedRequest<any>('GET', '/api/v3/account');
      const free = resp.balances.find((b: any) => b.asset === 'USDT')?.free || '0';
      return new Decimal(free).toFixed(2);
    } catch (err) {
      this.handleError(err, 'getSpotUsdtBalance');
    }
  }

  /** Obtiene el balance libre de USDT en la Funding Wallet */
  public async getFundingUsdtBalance(): Promise<string> {
    // 💡 CORRECCIÓN: Migramos a una llamada firmada manual
    try {
      const resp = await this.sendSignedRequest<any[]>('POST', '/sapi/v1/asset/get-funding-asset', { asset: 'USDT' });
      const total = resp.reduce((sum, b) => sum + parseFloat(b.free), 0);
      return new Decimal(total).toFixed(2);
    } catch (err) {
      this.handleError(err, 'getFundingUsdtBalance');
    }
  }

  /** Obtiene balances de USDT (Spot + Funding) */
  public async getUsdtBalances(): Promise<{
    spot: string;
    funding: string;
    total: string;
  }> {
    // 💡 CORRECCIÓN: Usamos las llamadas firmadas migradas
    try {
      const [spot, funding] = await Promise.all([this.getSpotUsdtBalance(), this.getFundingUsdtBalance()]);

      const spotDec = new Decimal(spot);
      const fundingDec = new Decimal(funding);

      return {
        spot: spotDec.toFixed(2),
        funding: fundingDec.toFixed(2),
        total: spotDec.plus(fundingDec).toFixed(2),
      };
    } catch (err) {
      this.handleError(err, 'getUsdtBalances');
    }
  }

  /* -------------------------- COIN INFO -------------------------- */

  /** Obtiene información de la red de USDT */
  public async getUsdtCoinInfo(coin: Asset, network: Network) {
    const coins = await this.sendSignedRequest<CoinInfoResponse>('GET', '/sapi/v1/capital/config/getall');
    const usdt = coins.find((c) => c.coin === coin);
    return usdt?.networkList.find((n) => n.network === network) ?? null;
  }

  /* -------------------------- WITHDRAWALS -------------------------- */

  public async withdrawFunds(
    params: BinanceWithdrawRequestParams,
  ): Promise<{ success: true; data: BinanceWithdrawResponse } | { success: false; error: string; isNetworkError?: boolean }> {
    try {
      const data = await this.sendSignedRequest<BinanceWithdrawResponse>('POST', '/sapi/v1/capital/withdraw/apply', params);
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error during Binance withdrawal',
        isNetworkError: error.isNetworkError === true,
      };
    }
  }

  public async getWithdrawHistory(params: BinanceWithdrawHistoryRequestParams) {
    return this.sendSignedRequest<BinanceWithdrawHistoryResponse>('GET', '/sapi/v1/capital/withdraw/history', params);
  }

  /* -------------------------- TRANSFERS -------------------------- */

  public async universalTransfer(params: BinanceUniversalTransferRequestParams) {
    return this.sendSignedRequest<BinanceUniversalTransferResponse>('POST', '/sapi/v1/asset/transfer', params);
  }

  /* -------------------------- CONVERT -------------------------- */

  public async sendQuoteRequest(params: QuoteRequest) {
    return this.sendSignedRequest<QuoteResponse>('POST', '/sapi/v1/convert/getQuote', params);
  }

  /**
   * Acepta una cotización de conversión usando el quoteId recibido.
   * @param params Debe contener el quoteId de la cotización a aceptar.
   */
  public async acceptQuote(params: AcceptQuoteRequest) {
    const { quoteId, recvWindow } = params;
    return this.sendSignedRequest<AcceptQuoteResponse>('POST', '/sapi/v1/convert/acceptQuote', {
      quoteId,
      ...(recvWindow !== undefined && { recvWindow }),
    });
  }

  //** Historial de pagos (BINANCE PAY) */
  public async getPayTradeHistory(params: GetPayTradeHistoryRequestParams = {}) {
    return this.sendSignedRequest<GetPayTradeHistoryResponse>('GET', '/sapi/v1/pay/transactions', params);
  }

  // probar ipinfo.io
  public async testIp() {
    const response = await fetch('https://ipinfo.io/json');
    if (!response.ok) {
      throw new Error(`Failed to test IP: ${response.statusText}`);
    }
    return response.json();
  }
}

/* ----------------------------- SINGLETON EXPORT ----------------------------- */

const binance = new BinanceService();
export default binance;
