import { useState } from 'react';
import { useStore } from './store';
import TodayView from './views/TodayView';
import CalendarView from './views/CalendarView';
import ClientsView from './views/ClientsView';
import ServicesView from './views/ServicesView';
import SettingsView from './views/SettingsView';

type Tab = 'today' | 'calendar' | 'clients' | 'services' | 'settings';

export default function App() {
  const darkMode = useStore((s) => s.settings.darkMode);
  const [activeTab, setActiveTab] = useState<Tab>('today');

  return (
    <div className={darkMode ? 'dark' : ''} style={{ height: '100%' }}>
      <div className="flex flex-col h-full bg-brand-light dark:bg-brand-dark text-brand-dark dark:text-brand-light">
        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'today' && <TodayView onNavigate={setActiveTab} />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'clients' && <ClientsView />}
          {activeTab === 'services' && <ServicesView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>

        {/* Bottom tab bar */}
        <nav className="bg-brand-dark dark:bg-brand-mid border-t border-brand-mid dark:border-brand-dark flex-shrink-0">
          <div className="flex">
            {(
              [
                { id: 'today', label: 'Today', icon: '📋' },
                { id: 'calendar', label: 'Calendar', icon: '📅' },
                { id: 'clients', label: 'Clients', icon: '👤' },
                { id: 'services', label: 'Services', icon: '✂️' },
                { id: 'settings', label: 'Settings', icon: '⚙️' },
              ] as { id: Tab; label: string; icon: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-2 px-1 text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'text-brand-teal'
                    : 'text-brand-light opacity-60 hover:opacity-100'
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className="mt-0.5">{tab.label}</span>
              </button>
            ))}
          </div>
          {/* Safe area padding for iOS */}
          <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
        </nav>
      </div>
    </div>
  );
}
