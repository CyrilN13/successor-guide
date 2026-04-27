import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, UserRoundX, FileCheck } from "lucide-react";

const reassuranceItems = [
  {
    icon: ClipboardList,
    title: "100% guidé",
    description: "Un parcours en 6 étapes claires pour ne rien oublier.",
  },
  {
    icon: UserRoundX,
    title: "Sans inscription",
    description:
      "Commencez immédiatement, créez un compte plus tard si vous le souhaitez.",
  },
  {
    icon: FileCheck,
    title: "Formulaires CERFA pré-remplis",
    description:
      "Les CERFA 2705-SD, 2705-S-SD et 2705-A-SD remplis selon vos données, prêts à imprimer et signer.",
  },
];

const Index = () => {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-background px-4 py-20 md:py-32">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-3xl font-bold leading-tight md:text-5xl">
            Préparez votre déclaration de succession en toute simplicité
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Un outil d'assistance qui vous guide pas à pas, sans obligation de
            rendez-vous.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base text-foreground/80 leading-relaxed">
            La déclaration de succession est une démarche que vous pouvez réaliser
            vous-même : les notaires ne sont pas les seuls à pouvoir la déposer.
            Ils interviennent en qualité d'experts, à un coût souvent significatif.
            Déesse vous apporte la même rigueur de structuration, en autonomie ou
            avec l'assistance de notre IA, pour une fraction du prix.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-base px-8">
              <Link to="/choix-mode">Commencer ma déclaration</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link to="/connexion">J'ai déjà un dossier</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Reassurance cards */}
      <section className="bg-accent-soft px-4 py-16 md:py-24">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-3">
            {reassuranceItems.map((item) => (
              <Card
                key={item.title}
                className="border border-transparent shadow-none bg-card transition-colors hover:border-accent-republic"
              >
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                    <item.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-serif text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* RGPD reassurance banner */}
      <section className="border-t border-border bg-accent-soft px-4 py-5">
        <p className="text-center text-sm text-foreground/80">
          Conforme RGPD — Données hébergées en Europe — Aucun document conservé
          au-delà de 90 jours
        </p>
      </section>

      {/* Disclaimer banner */}
      <section className="border-t border-border bg-muted/50 px-4 py-4">
        <p className="text-center text-xs text-muted-foreground">
          Outil d'assistance administrative. Ne remplace pas un conseil
          juridique.
        </p>
      </section>
    </div>
  );
};

export default Index;
