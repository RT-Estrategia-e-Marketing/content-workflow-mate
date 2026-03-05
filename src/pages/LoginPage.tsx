import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kanban, Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const { signIn, signUp, signOut, user } = useAuth();
  const { isApproved, loading: roleLoading } = useUserRole();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem('postflow_remember') === 'true' ? (localStorage.getItem('postflow_email') || '') : '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem('postflow_remember') === 'true');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) toast.error(error.message);
      else setResetSent(true);
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        setSignedUp(true);
      }
    } else {
      if (remember) {
        localStorage.setItem('postflow_remember', 'true');
        localStorage.setItem('postflow_email', email);
      } else {
        localStorage.removeItem('postflow_remember');
        localStorage.removeItem('postflow_email');
      }
      const { error } = await signIn(email, password);
      if (error) {
        toast.error('E-mail ou senha inválidos');
      }
    }
    setLoading(false);
  };

  // Show pending approval screen if user is logged in but not approved
  if (user && !roleLoading && !isApproved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-slide-in text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Kanban className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">PostFlow</span>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <Clock className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="font-display font-bold text-lg text-card-foreground mb-2">Aguardando Aprovação</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sua conta foi criada com sucesso. Um administrador precisa aprovar seu acesso antes que você possa usar o sistema.
            </p>
            <Button variant="outline" onClick={signOut} className="w-full">
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (signedUp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-slide-in text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Kanban className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">PostFlow</span>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <Clock className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="font-display font-bold text-lg text-card-foreground mb-2">Conta Criada!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sua conta foi criada com sucesso. Um administrador precisa aprovar seu acesso antes que você possa entrar no sistema. Aguarde a aprovação.
            </p>
            <Button variant="outline" onClick={() => setSignedUp(false)} className="w-full">
              Voltar ao login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-slide-in text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Kanban className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-foreground">PostFlow</span>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h2 className="font-display font-bold text-lg text-card-foreground mb-2">E-mail Enviado</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <Button variant="outline" onClick={() => { setResetSent(false); setIsForgotPassword(false); }} className="w-full">
              Voltar ao login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Kanban className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">PostFlow</span>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h2 className="font-display font-bold text-lg text-card-foreground mb-1">
            {isForgotPassword ? 'Recuperar Senha' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {isForgotPassword ? 'Digite seu e-mail para recuperar a senha' : isSignUp ? 'Preencha seus dados para começar' : 'Acesse sua conta PostFlow'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && !isForgotPassword && (
              <Input
                placeholder="Nome completo"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                maxLength={100}
              />
            )}
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              maxLength={255}
            />
            {!isForgotPassword && (
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            )}
            {!isSignUp && !isForgotPassword && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(!!checked)}
                  />
                  <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                    Lembrar e-mail
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci a senha
                </button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Carregando...' : isForgotPassword ? 'Enviar Link' : isSignUp ? 'Criar Conta' : 'Entrar'}
            </Button>
          </form>

          {isForgotPassword ? (
            <button
              onClick={() => setIsForgotPassword(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              Voltar ao login
            </button>
          ) : (
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
