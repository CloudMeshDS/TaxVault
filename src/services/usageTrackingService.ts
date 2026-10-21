import { CustomerUsage, TokenRequestLog } from '../types';
import { supabaseService } from './supabaseService';

const USAGE_KEY = 'taxvault_customer_usage_v1';
const TOKEN_LOGS_KEY = 'taxvault_token_logs_v1';
const MAX_LOCAL_TOKEN_LOGS = 100;

class UsageTrackingService {
  /**
   * Get current usage period start date (first day of current month)
   */
  private getPeriodStart(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  }

  /**
   * Get current usage period end date (last day of current month)
   */
  private getPeriodEnd(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  /**
   * Get cached or initial customer usage
   */
  public getLocalUsage(userId: string = 'usr_taxvault_admin'): CustomerUsage {
    try {
      const stored = localStorage.getItem(USAGE_KEY);
      if (stored) {
        const parsed: CustomerUsage = JSON.parse(stored);
        if (parsed.periodStart === this.getPeriodStart()) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    const defaultUsage: CustomerUsage = {
      id: 'usg_' + Date.now(),
      userId,
      periodStart: this.getPeriodStart(),
      periodEnd: this.getPeriodEnd(),
      scansUsed: 12,
      scansLimit: 500,
      tokensUsed: 18450,
      tokensLimit: 2000000,
      requestsCount: 24,
      requestsLimit: 1000,
      exportsCount: 3,
      exportsLimit: -1,
      storageBytesUsed: 14500000,
      storageBytesLimit: 104857600,
      lastRequestAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.saveLocalUsage(defaultUsage);
    return defaultUsage;
  }

  private saveLocalUsage(usage: CustomerUsage): void {
    try {
      localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    } catch {
      // ignore
    }
  }

  public getLocalTokenLogs(): TokenRequestLog[] {
    try {
      const stored = localStorage.getItem(TOKEN_LOGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }

    const initialLogs: TokenRequestLog[] = [
      {
        id: 'tok_01',
        userId: 'usr_taxvault_admin',
        requestType: 'receipt_ocr',
        modelName: 'gemini-2.5-flash',
        promptTokens: 412,
        completionTokens: 186,
        totalTokens: 598,
        latencyMs: 148,
        estimatedCostUsd: 0.000062,
        status: 'success',
        metadata: { merchant: 'Amazon India', fieldCount: 9 },
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: 'tok_02',
        userId: 'usr_taxvault_admin',
        requestType: 'receipt_ocr',
        modelName: 'gemini-3.5-flash-lite',
        promptTokens: 380,
        completionTokens: 142,
        totalTokens: 522,
        latencyMs: 112,
        estimatedCostUsd: 0.000045,
        status: 'success',
        metadata: { merchant: 'InterGlobe Aviation', fieldCount: 8 },
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'tok_03',
        userId: 'usr_taxvault_admin',
        requestType: 'tax_categorization',
        modelName: 'gemini-2.5-flash',
        promptTokens: 210,
        completionTokens: 85,
        totalTokens: 295,
        latencyMs: 95,
        estimatedCostUsd: 0.000028,
        status: 'success',
        metadata: { category: 'Client Entertainment', statutoryRule: 'Section 16 CGST' },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    this.saveLocalTokenLogs(initialLogs);
    return initialLogs;
  }

  private saveLocalTokenLogs(logs: TokenRequestLog[]): void {
    try {
      const capped = logs.slice(0, MAX_LOCAL_TOKEN_LOGS);
      localStorage.setItem(TOKEN_LOGS_KEY, JSON.stringify(capped));
    } catch {
      // ignore
    }
  }

  /**
   * Record an AI or API request: updates token counter, customer usage, and writes to log
   */
  public recordAIRequest(params: {
    userId?: string;
    requestType: TokenRequestLog['requestType'];
    modelName: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    status?: 'success' | 'failed' | 'rate_limited';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): TokenRequestLog {
    const userId = params.userId || 'usr_taxvault_admin';
    const totalTokens = Math.max(0, params.promptTokens + params.completionTokens);

    // Cost estimate (Gemini Flash ~$0.075 per 1M input, $0.30 per 1M output)
    const costUsd =
      (params.promptTokens * 0.000000075) +
      (params.completionTokens * 0.00000030);

    const log: TokenRequestLog = {
      id: 'tok_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      requestType: params.requestType,
      modelName: params.modelName,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens,
      latencyMs: params.latencyMs,
      estimatedCostUsd: Number(costUsd.toFixed(6)),
      status: params.status || 'success',
      errorMessage: params.errorMessage,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    // 1. Update local token logs
    const logs = this.getLocalTokenLogs();
    this.saveLocalTokenLogs([log, ...logs]);

    // 2. Update customer usage counters
    const usage = this.getLocalUsage(userId);
    usage.tokensUsed += totalTokens;
    usage.requestsCount += 1;
    if (params.requestType === 'receipt_ocr') {
      usage.scansUsed += 1;
    }
    usage.lastRequestAt = new Date().toISOString();
    usage.updatedAt = new Date().toISOString();
    this.saveLocalUsage(usage);

    // 3. Sync to Supabase in the background
    supabaseService.recordTokenRequest(log).catch(() => {});
    supabaseService.upsertCustomerUsage(usage).catch(() => {});

    return log;
  }

  /**
   * Record export usage (PDF, Excel)
   */
  public recordExportUsage(userId: string = 'usr_taxvault_admin'): void {
    const usage = this.getLocalUsage(userId);
    usage.exportsCount += 1;
    usage.updatedAt = new Date().toISOString();
    this.saveLocalUsage(usage);
    supabaseService.upsertCustomerUsage(usage).catch(() => {});
  }

  /**
   * Get combined usage summary from local or remote
   */
  public async getUsageSummary(userId: string = 'usr_taxvault_admin'): Promise<CustomerUsage> {
    const local = this.getLocalUsage(userId);
    try {
      const { usage: remote } = await supabaseService.fetchCustomerUsage(userId);
      if (remote) {
        this.saveLocalUsage(remote);
        return remote;
      }
    } catch {
      // offline fallback
    }
    return local;
  }
}

export const usageTrackingService = new UsageTrackingService();
