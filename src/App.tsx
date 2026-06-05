import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import KanbanPage from "@/pages/KanbanPage";
import CalendarPage from "@/pages/CalendarPage";
import SettingsPage from "@/pages/SettingsPage";
import GeneralSettingsPage from "@/pages/GeneralSettingsPage";
import ApprovalPage from "@/pages/ApprovalPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import NotFound from "./pages/NotFound";
import TrashPage from '@/pages/TrashPage';
import ReportsPage from '@/pages/ReportsPage';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isApproved, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><span className="text-muted-foreground">Carregando...</span></div>;
  if (!user || !isApproved) return <LoginPage />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/general-settings" element={<GeneralSettingsPage />} />
                <Route path="/trash" element={<TrashPage />} />
              </Route>
              <Route path="/internal-approve/:token" element={<AuthGuard><ApprovalPage isInternal /></AuthGuard>} />
              <Route path="/approve/:token" element={<ApprovalPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
