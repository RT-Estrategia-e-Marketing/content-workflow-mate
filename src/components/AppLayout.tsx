import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useState, useEffect } from 'react';
import { Menu, X, Kanban } from 'lucide-react';

const TABLET_BREAKPOINT = 1024;

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < TABLET_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {isCompact && (
        <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar flex items-center justify-between px-4 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-accent active:scale-95 transition-all"
            >
              <div className="relative w-5 h-5">
                <Menu className={`w-5 h-5 absolute transition-all duration-300 ${sidebarOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'}`} />
                <X className={`w-5 h-5 absolute transition-all duration-300 ${sidebarOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`} />
              </div>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Kanban className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-sidebar-primary-foreground">PostFlow</span>
            </div>
          </div>
        </header>
      )}

      {isCompact && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar
        mobileOpen={isCompact ? sidebarOpen : undefined}
        onClose={() => setSidebarOpen(false)}
        hideHeader={isCompact}
      />
      <main className={`transition-all duration-300 ${isCompact ? 'pt-20 p-4' : 'ml-64 p-8'}`}>
        <Outlet />
      </main>
    </div>
  );
}
