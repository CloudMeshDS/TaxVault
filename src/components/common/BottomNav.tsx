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
    { id: 'cashare' as NavigationTab, label: 'CA Share', icon: Users },
    { id: 'settings' as NavigationTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 select-none shadow-lg pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto px-1 sm:px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-3.5 flex-1 max-w-[80px] rounded-2xl transition-all duration-200 cursor-pointer relative active:scale-90 ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Active soft pill indicator with fluid scale */}
              {isActive && (
                <span className="absolute inset-0 bg-emerald-50 border border-emerald-200/60 rounded-2xl -z-10 animate-in fade-in zoom-in-95 duration-200" />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5px] scale-110' : 'stroke-2 hover:scale-105'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-white font-black text-xs min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 tracking-tight transition-colors duration-150 whitespace-nowrap ${isActive ? 'font-bold text-emerald-700' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
