import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface BottomNavProps {
  currentTab?: 'table' | 'loot' | 'ranks' | 'me';
  onTabChange?: (tab: 'table' | 'loot' | 'ranks' | 'me') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (currentTab) return currentTab;
    if (location.pathname.startsWith('/loot')) return 'loot';
    if (location.pathname.startsWith('/ranks')) return 'ranks';
    if (location.pathname.startsWith('/me')) return 'me';
    return 'table';
  };

  const active = getActiveTab();

  const tabs = [
    { id: 'table', label: 'Table', icon: '🎲', path: '/home' },
    { id: 'loot', label: 'Loot', icon: '🍾', path: '/loot' },
    { id: 'ranks', label: 'Ranks', icon: '🏆', path: '/ranks' },
    { id: 'me', label: 'Me', icon: '👤', path: '/me' },
  ] as const;

  const handleSelect = (tab: typeof tabs[number]) => {
    if (onTabChange) {
      onTabChange(tab.id);
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-chit border-t-2 border-x-2 border-ink shadow-hard-lg rounded-t-xl z-40 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isSelected = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all btn-press ${
                isSelected
                  ? 'text-dare font-black scale-105'
                  : 'text-ink-muted font-normal hover:text-ink'
              }`}
            >
              <span className="text-xl select-none">{tab.icon}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
