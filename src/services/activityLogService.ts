import { ActivityLog } from '../types';
import { supabaseService } from './supabaseService';

const STORAGE_KEY = 'taxvault_activity_logs_v1';
const MAX_LOCAL_LOGS = 150;

class ActivityLogService {
  private inMemoryCache: ActivityLog[] | null = null;

  constructor() {
    this.ensureInitialLogs();
  }

  private ensureInitialLogs(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Start with an empty log: only real actions by this user are recorded
        this.saveLocalLogs([]);
        return;
      }
      // Earlier versions seeded made-up sample entries (ids act_init_*); remove them
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.some((log: ActivityLog) => String(log?.id).startsWith('act_init_'))) {
        this.saveLocalLogs(parsed.filter((log: ActivityLog) => !String(log?.id).startsWith('act_init_')));
      }
    } catch {
      // ignore
    }
  }

  private getLocalLogs(): ActivityLog[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  private saveLocalLogs(logs: ActivityLog[]): void {
    try {
      const capped = logs.slice(0, MAX_LOCAL_LOGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
      this.inMemoryCache = capped;
    } catch {
      // ignore
    }
  }

  /**
   * Log an activity locally and to Supabase
   */
  public logActivity(entry: {
    userId?: string;
    entityType: ActivityLog['entityType'];
    entityId?: string;
    action: ActivityLog['action'];
    description: string;
    status?: ActivityLog['status'];
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }): ActivityLog {
    const log: ActivityLog = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      description: entry.description,
      status: entry.status || 'success',
      changes: entry.changes,
      devicePlatform: (window as any)?.Capacitor?.isNativePlatform?.() ? 'android' : 'web',
      userAgent: navigator.userAgent.substring(0, 150),
      metadata: entry.metadata,
      createdAt: new Date().toISOString(),
    };

    // 1. Save to local storage for immediate UI reactivity
    const current = this.getLocalLogs();
    this.saveLocalLogs([log, ...current]);

    // 2. Asynchronously sync to Supabase activity_logs table
    supabaseService.recordActivityLog(log).catch(() => {
      // gracefully handled, offline-first
    });

    return log;
  }

  /**
   * Fetch recent activity logs (merged local + Supabase if available)
   */
  public async getRecentLogs(userId?: string, limit: number = 50): Promise<ActivityLog[]> {
    const local = this.getLocalLogs();

    try {
      const { logs: remoteLogs } = await supabaseService.fetchActivityLogs(userId, limit);
      if (remoteLogs && remoteLogs.length > 0) {
        // Merge and deduplicate by id
        const map = new Map<string, ActivityLog>();
        for (const l of remoteLogs) map.set(l.id, l);
        for (const l of local) if (!map.has(l.id)) map.set(l.id, l);
        return Array.from(map.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      }
    } catch {
      // use local if offline
    }

    return local.slice(0, limit);
  }

  /**
   * Clear all local activity logs
   */
  public clearLogs(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.inMemoryCache = [];
    } catch {
      // ignore
    }
  }
}

export const activityLogService = new ActivityLogService();
