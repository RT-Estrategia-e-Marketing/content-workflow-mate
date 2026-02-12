import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Kanban } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendário' },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-30">
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Kanban className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-display text-xl font-bold text-sidebar-primary-foreground">PostFlow</span>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mx-3 mb-4 rounded-lg bg-sidebar-accent">
        <p className="text-xs text-sidebar-foreground/60">Versão beta</p>
        <p className="text-xs text-sidebar-foreground/40 mt-1">PostFlow © 2026</p>
      </div>
    </aside>
  );
}
