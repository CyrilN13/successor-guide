import { Sparkles, ShieldCheck, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BlocPropositionExpertProps {
  title: string;
  message: string;
  onSelectAutonomie?: () => void;
  onSelectExpertise?: () => void;
  onSelectNotaire?: () => void;
}

const BlocPropositionExpert = ({
  title,
  message,
  onSelectAutonomie,
  onSelectExpertise,
  onSelectNotaire,
}: BlocPropositionExpertProps) => {
  const options = [
    {
      icon: Sparkles,
      title: "Continuer en autonomie (gratuit)",
      description:
        "Vous saisissez les informations vous-même. Nous générons les CERFA pré-remplis. La validation finale reste sous votre responsabilité.",
      onClick: onSelectAutonomie,
      badge: null as string | null,
      disabled: false,
    },
    {
      icon: ShieldCheck,
      title: "Forfait expertise (à venir)",
      description:
        "Un de nos juristes partenaires relit votre dossier et valide la stratégie fiscale.",
      onClick: onSelectExpertise,
      badge: "Bientôt disponible",
      disabled: true,
    },
    {
      icon: Building2,
      title: "Consulter un notaire",
      description:
        "Pour les dossiers complexes (testament, démembrements, biens à l'étranger), le notaire reste l'option la plus adaptée.",
      onClick: onSelectNotaire,
      badge: null,
      disabled: false,
    },
  ];

  return (
    <section className="space-y-6">
      <header className="text-center space-y-2">
        <h2 className="font-heading text-xl md:text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground leading-relaxed">{message}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => {
          const Icon = opt.icon;
          const clickable = !opt.disabled && !!opt.onClick;
          return (
            <Card
              key={opt.title}
              onClick={clickable ? opt.onClick : undefined}
              className={`relative h-full transition-all border ${
                clickable
                  ? "cursor-pointer hover:border-accent hover:shadow-md"
                  : opt.disabled
                  ? "opacity-70"
                  : ""
              }`}
            >
              <CardContent className="p-5 flex flex-col gap-3 h-full">
                {opt.badge && (
                  <Badge
                    variant="secondary"
                    className="absolute top-3 right-3 text-xs"
                  >
                    {opt.badge}
                  </Badge>
                )}
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-base leading-snug">
                  {opt.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default BlocPropositionExpert;
