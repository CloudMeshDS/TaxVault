import React from 'react';
import { Home, ReceiptText, BarChart3, Users, Settings } from 'lucide-react';

export type NavigationTab = 'home' | 'expenses' | 'reports' | 'cashare' | 'settings';

interface BottomNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  reviewCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  reviewCount = 0,
}) => {
  const tabs = [
    { id: 'home' as NavigationTab, label: 'Home', icon: Home },
    {
      id: 'expenses' as NavigationTab,
      label: 'Expenses',
      icon: ReceiptText,
      badge: reviewCount > 0 ? reviewCount : undefined,
    },
    { id: 'reports' as NavigationTab, label: 'Reports', icon: BarChart3 },
    { id: 'cashare' as NavigationTab, label: 'Accountant', icon: Users },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings },
  ];  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-4xl mx-auto px-1 flex items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 min-w-0 h-16 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-colors ${isActive ? 'bg-emerald-50' : ''}`}>
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
                {tab.badge && (
                  <span className="absolute -top-0.5 right-2 bg-rose-600 text-on-fill font-semibold text-[0.6875rem] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className={`text-[0.75rem] leading-none whitespace-nowrap max-w-full ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
;
};
