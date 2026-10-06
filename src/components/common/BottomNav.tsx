import React from 'react';
import { LayoutDashboard, Receipt, FileText, Globe, Shield } from 'lucide-react';

export type NavigationTab = 'dashboard' | 'expenses' | 'accountant' | 'currency' | 'settings';

interface BottomNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as NavigationTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses' as NavigationTab, label: 'Receipts', icon: Receipt, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'accountant' as NavigationTab, label: 'CA Filing', icon: FileText },
    { id: 'currency' as NavigationTab, label: 'Currency', icon: Globe },
    { id: 'settings' as NavigationTab, label: 'Tax & Security', icon: Shield },
  ];

  return (
    <nav className="bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 px-2 py-1.5 flex items-center justify-around z-30 select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-all relative ${
              isActive
                ? 'text-emerald-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              {tab.badge && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-neutral-950 font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
