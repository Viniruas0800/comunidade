import React from 'react';
import { Headset, ShieldAlert, Lightbulb } from 'lucide-react';

export const SupportView: React.FC = () => {
  const supportUrl = 'https://form.typeform.com/to/JukE3l3x';

  const supportCards = [
    {
      icon: Headset,
      title: 'Canais de suporte',
      description: 'Gestão de assinatura, questões financeiras, controle de acessos e problemas técnicos. Atendimento responde em horário comercial. Resolva questões administrativas rápido e volte a focar em aplicar estratégias.',
      buttonText: 'Fale com o suporte'
    },
    {
      icon: ShieldAlert,
      title: 'Denúncias',
      description: 'Ajude a manter o ambiente saudável. Preencha o formulário anônimo para denunciar comportamentos inadequados ou violação das regras. Sua contribuição protege a comunidade e garante boa convivência para todos.',
      buttonText: 'Faça sua denúncia aqui'
    },
    {
      icon: Lightbulb,
      title: 'Sugestões',
      description: 'Sua opinião importa. Compartilhe ideias para melhorar a comunidade, novas funcionalidades da área de membros ou conteúdos que quer ver. Construímos esse ecossistema juntos. Ajude a evoluir e gerar mais resultado.',
      buttonText: 'Contribua com sua sugestão'
    }
  ];

  const handleCardClick = () => {
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Central de Ajuda</h1>
        <p className="text-textMuted">Escolha uma categoria para entrar em contato conosco</p>
      </div>

      {/* Support Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {supportCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <div
              key={index}
              className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-6 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(139,44,245,0.1)] transition-all duration-300 group flex flex-col"
            >
              <div className="flex flex-col items-start gap-4 flex-1">
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-surfaceHighlight flex items-center justify-center group-hover:scale-110 transition-transform text-primary">
                  <IconComponent size={24} />
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-primary transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-textMuted leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Button */}
                <button
                  onClick={handleCardClick}
                  className="w-full bg-[#262626] hover:bg-[#333] text-white py-2 rounded-lg mt-4 text-sm font-medium transition-colors"
                >
                  {card.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

