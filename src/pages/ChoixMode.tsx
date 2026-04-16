import { useNavigate } from "react-router-dom";
import { Pencil, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";


const generateToken = () => {
  return crypto.randomUUID();
};

const ChoixMode = () => {
  const navigate = useNavigate();

  const handleChoix = async (mode: "autonomie" | "ia") => {
    let token = localStorage.getItem("deesse_token");
    if (!token) {
      token = generateToken();
      localStorage.setItem("deesse_token", token);
    }

    // Check if a declaration already exists for this token
    const { data: existing } = await supabase
      .from("declarations")
      .select("id")
      .eq("anonymous_token", token)
      .maybeSingle();

    if (existing) {
      // Update the mode on the existing declaration
      await supabase
        .from("declarations")
        .update({ mode })
        .eq("id", existing.id);
    } else {
      const { error } = await supabase.from("declarations").insert({
        mode,
        anonymous_token: token,
        user_id: null,
        status: "draft",
        current_step: 0,
      });

      if (error) {
        console.error("Erreur création déclaration:", error);
        return;
      }
    }

    navigate("/diagnostic");
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-center mb-2">
        Comment souhaitez-vous remplir votre déclaration ?
      </h1>
      <p className="text-center text-muted-foreground mb-10">
        Choisissez le parcours qui vous convient le mieux.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Carte Autonomie */}
        <Card
          className="cursor-pointer hover:border-accent transition-colors group flex flex-col"
          onClick={() => handleChoix("autonomie")}
        >
          <CardContent className="p-8 flex flex-col items-center text-center flex-1">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-5">
              <Pencil className="w-7 h-7 text-accent" />
            </div>
            <h2 className="font-heading text-xl font-semibold mb-3">
              Je saisis moi-même
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
              Parcours guidé en 6 étapes. Vous saisissez toutes les informations
              à la main. Durée estimée : 45 min à 2h selon la complexité.
            </p>
            <Button variant="outline" className="w-full group-hover:border-accent">
              Choisir Autonomie
            </Button>
          </CardContent>
        </Card>

        {/* Carte IA */}
        <Card
          className="cursor-pointer hover:border-accent transition-colors group flex flex-col relative"
          onClick={() => handleChoix("ia")}
        >
          <CardContent className="p-8 flex flex-col items-center text-center flex-1">
            <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground hover:bg-accent/90">
              Assisté
            </Badge>
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-accent" />
            </div>
            <h2 className="font-heading text-xl font-semibold mb-3">
              J'utilise l'assistance IA
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
              Déposez vos documents (acte de décès, relevés bancaires,
              titres...). L'IA extrait les informations et pré-remplit les
              étapes. Vous vérifiez et complétez. Durée estimée : 20 min à 1h.
            </p>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Choisir IA
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        Vous pourrez changer de mode à tout moment.
      </p>
    </div>
  );
};

export default ChoixMode;
