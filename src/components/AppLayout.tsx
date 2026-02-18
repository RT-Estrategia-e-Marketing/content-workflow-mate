import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar flex items-center px-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-sidebar-foreground p-2">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-display text-lg font-bold text-sidebar-primary-foreground ml-2">PostFlow</span>
        </header>
      )}

      {/* Sidebar overlay on mobile */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <AppSidebar mobileOpen={isMobile ? sidebarOpen : undefined} onClose={() => setSidebarOpen(false)} />
      <main className={`${isMobile ? 'pt-14 p-4' : 'ml-64 p-8'}`}>
        <Outlet />
      </main>
    </div>
  );
}
