import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate(-1)} 
        className="mb-8 text-muted-foreground hover:text-foreground hover:bg-accent/50"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <h1 className="text-3xl font-display font-bold mb-8">Política de Privacidade</h1>
      
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Coleta de Informações</h2>
          <p>
            Coletamos informações necessárias para a prestação de nossos serviços de gerenciamento de conteúdo e fluxo de trabalho. 
            Isso inclui dados de perfil, informações de login através de serviços de terceiros (como Facebook/Meta) e conteúdos 
            de mídia enviados para a plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Uso de Dados</h2>
          <p>
            Os dados coletados são utilizados exclusivamente para:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Gerenciar o fluxo de aprovação de posts sociais.</li>
            <li>Possibilitar o agendamento e publicação em redes sociais via API oficial da Meta.</li>
            <li>Personalizar a experiência do usuário e facilitar a colaboração entre equipes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Integrações de Terceiros</h2>
          <p>
            Nosso aplicativo utiliza os Serviços da Meta (Facebook e Instagram). Ao utilizar estas integrações, 
            você também está sujeito às políticas de privacidade da Meta. Nós não compartilhamos suas senhas; 
            o acesso é realizado via tokens de acesso seguros (OAuth).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Segurança</h2>
          <p>
            Empregamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso 
            não autorizado, perda ou alteração.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Contato</h2>
          <p>
            Para questões sobre sua privacidade ou exclusão de dados, entre em contato com o administrador do seu workspace.
          </p>
        </section>

        <p className="pt-8 text-xs italic">Última atualização: Março de 2026</p>
      </div>
    </div>
  );
}
