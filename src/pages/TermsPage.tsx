import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 max-w-3xl mx-auto">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate(-1)} 
        className="mb-8 hover:bg-muted"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <h1 className="text-3xl font-display font-bold mb-8">Termos de Uso</h1>
      
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar o PostFlow, você concorda em cumprir e ser regido por estes Termos de Uso. 
            Se você não concordar com qualquer parte destes termos, não deverá utilizar o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
          <p>
            O PostFlow é uma ferramenta de gestão de fluxo de trabalho para redes sociais, permitindo a criação, 
            aprovação e agendamento de conteúdos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Responsabilidades do Usuário</h2>
          <p>
            O usuário é responsável por:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Manter a confidencialidade de suas credenciais de acesso.</li>
            <li>Todo o conteúdo publicado através da ferramenta.</li>
            <li>Garantir que possui os direitos autorais ou permissões necessárias para as mídias enviadas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Uso das APIs Sociais</h2>
          <p>
            O uso das funcionalidades de publicação automática está condicionado à conformidade com as políticas 
            de desenvolvedor da Meta (Facebook/Instagram). Abusos ou violações dessas políticas podem resultar 
            na suspensão do acesso à integração.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitação de Responsabilidade</h2>
          <p>
            O serviço é fornecido "como está". Não garantimos que a plataforma estará sempre disponível ou livre 
            de erros, especialmente em decorrência de alterações não planejadas nas APIs de terceiros.
          </p>
        </section>

        <p className="pt-8 text-xs italic">Última atualização: Março de 2026</p>
      </div>
    </div>
  );
}
