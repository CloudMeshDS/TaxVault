import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
  Trash2,
  RefreshCw,
  X,
  Shield,
  Layers,
  Sparkles,
  Server,
  ArrowUpRight,
  Filter,
  Cpu,
} from 'lucide-react';
import { ActivityLog, CustomerUsage, TokenRequestLog, UserProfile } from '../../types';
import { activityLogService } from '../../services/activityLogService';
import { usageTrackingService } from '../../services/usageTrackingService';

interface ActivityAndUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  initialTab?: 'activity' | 'usage';
  onOpenSubscription?: () => void;
}

export const ActivityAndUsageModal: React.FC<ActivityAndUsageModalProps> = ({
  isOpen,
  onClose,
  profile,
  initialTab = 'activity',
  onOpenSubscription,
}) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'usage'>(initialTab);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [tokenLogs, setTokenLogs] = useState<TokenRequestLog[]>([]);
  const [usage, setUsage] = useState<CustomerUsage | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, profile.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const logs = await activityLogService.getRecentLogs(profile.id, 60);
      setActivityLogs(logs);

      const usageData = await usageTrackingService.getUsageSummary(profile.id);
      setUsage(usageData);

      const tLogs = usageTrackingService.getLocalTokenLogs();
      setTokenLogs(tLogs);
    } catch (e) {
      console.warn('Failed loading logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredLogs = activityLogs.filter((log) => {
    if (filterType === 'all') return true;
    if (filterType === 'ai_scan') return log.entityType === 'ai_scan';
    if (filterType === 'expense') return log.entityType === 'expense' || log.entityType === 'income';
    if (filterType === 'subscription') return log.entityType === 'subscription';
    if (filterType === 'system') return log.entityType === 'settings' || log.entityType === 'auth' || log.entityType === 'export';
    return true;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activityLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `taxvault_activity_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatTimeAgo = (isoString: string) => {
    const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const currentTier = profile.subscription.tier;
  const tokenLimit = usage?.tokensLimit && usage.tokensLimit > 0 ? usage.tokensLimit : (currentTier === 'free' ? 50000 : 2000000);
  const tokensUsed = usage?.tokensUsed || 0;
  const tokenPct = Math.min(100, Math.round((tokensUsed / tokenLimit) * 100));

  const scansLimit = usage?.scansLimit && usage.scansLimit > 0 ? usage.scansLimit : (currentTier === 'free' ? 10 : 500);
  const scansUsed = usage?.scansUsed || profile.subscription.receiptsScannedThisMonth || 0;
  const scanPct = scansLimit === -1 ? 15 : Math.min(100, Math.round((scansUsed / scansLimit) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-3 select-none modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden modal-enter-animation text-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              {activeTab === 'activity' ? <Activity className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {activeTab === 'activity' ? 'Activity Audit Trail' : 'Token & Request Usage'}
              </h2>
              <p className="text-xs text-slate-500">
                {activeTab === 'activity' ? 'Cloud log of your account and AI actions' : 'AI consumption meter and quota tracking'}
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          <div className="flex items-center p-1 bg-white shadow-xs border border-slate-200 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'activity' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>Activity Log</span>
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'usage' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Token Usage</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              aria-label="Refresh"
              onClick={loadData}
              disabled={isLoading}
              title="Refresh"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'activity' && (
              <button
                onClick={handleExportJson}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3 h-3 shrink-0" />
                <span>Export JSON</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 pb-8">
          {activeTab === 'activity' ? (
            <>
              {/* Category Filter Pills */}
              <div
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs"
              >
                {[
                  { id: 'all', label: 'All Activities' },
                  { id: 'ai_scan', label: 'AI OCR Scans' },
                  { id: 'expense', label: 'Expenses' },
                  { id: 'subscription', label: 'Subscriptions' },
                  { id: 'system', label: 'Cloud & Auth' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      filterType === f.id
                        ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40 font-bold'
                        : 'bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Activity Feed */}
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-slate-200">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-700 font-bold">No activity recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Actions like scanning receipts, editing expenses, and subscription upgrades will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log) => {
                    const isSuccess = log.status === 'success';
                    const isWarning = log.status === 'warning';
                    return (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl hover:border-slate-200 transition-colors flex items-start gap-3 select-text"
                      >
                        {/* Status Icon */}
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : isWarning
                              ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-700 border border-red-500/20'
                          }`}
                        >
                          {log.entityType === 'ai_scan' ? (
                            <Sparkles className="w-3.5 h-3.5" />
                          ) : log.entityType === 'subscription' ? (
                            <Zap className="w-3.5 h-3.5" />
                          ) : (
                            <Activity className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                              {log.entityType} · {log.action.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
                              {formatTimeAgo(log.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium mt-0.5 leading-snug">
                            {log.description}
                          </p>

                          {/* Metadata chip if available */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1 text-xs font-mono text-slate-500">
                              {Object.entries(log.metadata)
                                .slice(0, 3)
                                .map(([k, v]) => (
                                  <span key={k} className="bg-white shadow-xs px-1.5 py-0.5 rounded border border-slate-200">
                                    {k}: {String(v)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* TAB 2: TOKEN & REQUEST USAGE */
            <div className="space-y-3.5">
              {/* Plan Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-50 to-slate-50 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Active Plan</span>
                    <span className="text-xs font-mono bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded font-extrabold uppercase">
                      {currentTier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly billing cycle ({usage?.periodStart || 'Active'} to {usage?.periodEnd || 'End of month'})
                  </p>
                </div>
                {onOpenSubscription && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSubscription();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                  >
                    <span>Manage Plan</span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                )}
              </div>

              {/* Meter 1: AI Tokens */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gemini AI Tokens Used</span>
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {tokensUsed.toLocaleString()} / {tokenLimit === -1 ? 'Unlimited' : tokenLimit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${tokenPct}%` }}
                    className={`h-full rounded-full transition-all ${tokenPct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Input + Output Completion Tokens</span>
                  <span>{tokenLimit === -1 ? 'Unlimited' : `${Math.max(0, tokenLimit - tokensUsed).toLocaleString()} tokens remaining`}</span>
                </div>
              </div>

              {/* Meter 2: Monthly Scans */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-700" />
                    <span>Monthly Receipt Scans</span>
                  </span>
                  <span className="font-mono text-blue-700 font-bold">
                    {scansUsed} / {scansLimit === -1 ? 'Unlimited' : scansLimit}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${scanPct}%` }}
                    className="h-full rounded-full bg-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>High-speed Multimodal Vision OCR</span>
                  <span>{scansLimit === -1 ? 'Unlimited scans' : `${Math.max(0, scansLimit - scansUsed)} scans left this cycle`}</span>
                </div>
              </div>

              {/* Recent AI Request Ledger */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Recent Token Ledger</span>
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {tokenLogs.length} requests logged
                  </span>
                </div>

                <div className="space-y-1.5">
                  {tokenLogs.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs flex items-center justify-between select-text"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-white">{t.modelName}</span>
                          <span className="text-xs bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-mono">
                            {t.requestType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.latencyMs}ms latency · est. ${t.estimatedCostUsd.toFixed(5)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-emerald-600">
                          {t.totalTokens} tokens
                        </span>
                        <p className="text-xs text-slate-400">
                          {t.promptTokens} in / {t.completionTokens} out
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Stored with your TaxVault account</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
