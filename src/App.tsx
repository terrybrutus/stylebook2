import { useState, useEffect } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import TodayView from './views/TodayView';
import CalendarView from './views/CalendarView';
import ClientsView from './views/ClientsView';
import ServicesView from './views/ServicesView';
import SettingsView from './views/SettingsView';

type Tab = 'today' | 'calendar' | 'clients' | 'services' | 'settings';

export default function App() {
  const { darkMode, appointmentHistory, appointmentFuture, undo, redo } = useStore(
    useShallow((s) => ({
      darkMode: s.settings.darkMode,
      appointmentHistory: s.appointmentHistory,
      appointmentFuture: s.appointmentFuture,
      undo: s.undo,
      redo: s.redo,
    }))
  );
  const [activeTab, setActiveTab] = useState<Tab>('today');

  const canUndo = appointmentHistory.length > 0;
  const canRedo = appointmentFuture.length > 0;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  return (
    <div className={darkMode ? 'dark' : ''} style={{ height: '100%' }}>
      <div className="flex flex-col h-full bg-brand-light dark:bg-brand-dark text-brand-dark dark:text-brand-light">
        {/* TEST BANNER — remove after confirming import works */}
        <div style={{ background: '#FF6B00', color: '#fff', textAlign: 'center', padding: '6px', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>
          ✓ CLAUDE CODE UPDATE APPLIED
        </div>
        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'today' && <TodayView onNavigate={setActiveTab} />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'clients' && <ClientsView />}
          {activeTab === 'services' && <ServicesView />}
          {activeTab === 'settings' && <SettingsView />}
        </div>

        {/* Floating undo/redo pill — bottom-left above tab bar */}
        <div
          className="fixed bottom-20 left-3 z-40 flex gap-1 bg-white dark:bg-brand-mid rounded-full shadow-lg border border-gray-200 dark:border-brand-dark px-1 py-1"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
        >
          <button
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className={`flex items-center justify-center rounded-full transition-colors ${
              canUndo
                ? 'text-brand-dark dark:text-brand-light hover:bg-brand-teal/20'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className={`flex items-center justify-center rounded-full transition-colors ${
              canRedo
                ? 'text-brand-dark dark:text-brand-light hover:bg-brand-teal/20'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            style={{ minWidth: 44, minHeight: 44 }}
          >
            ↪
          </button>
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
