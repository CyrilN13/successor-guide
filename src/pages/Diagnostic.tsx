import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

const QUESTIONS = [
  "Le défunt possédait-il un bien immobilier d'une valeur supérieure à 100 000 € ?",
  "Un testament a-t-il été rédigé par le défunt ?",
  "Y a-t-il un héritier mineur parmi les héritiers directs ?",
  "Le défunt possédait-il des biens à l'étranger ?",
  "Y a-t-il une contestation ou un litige entre héritiers ?",
  "Le défunt était-il chef d'entreprise ou détenait-il des parts majoritaires d'une société non cotée ?",
  "Des donations-partages ou des contrats d'assurance-vie avec clause bénéficiaire complexe ont-ils été signés ?",
];

// Questions 3,4,5 (index 2,3,4) → blocking
const BLOCKING_INDICES = [2, 3, 4];
// Questions 1,2,6,7 (index 0,1,5,6) → warning
const WARNING_INDICES = [0, 1, 5, 6];

type Screen = "questions" | "blocked" | "warning";

const Diagnostic = () => {
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "oui" | "non">>({});
  const [screen, setScreen] = useState<Screen>("questions");
  const [saving, setSaving] = useState(false);

  const handleAnswer = (value: "oui" | "non") => {
    const updated = { ...answers, [currentQ]: value };
    setAnswers(updated);

    // Auto-advance after a short delay
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ((prev) => prev + 1);
      }
    }, 400);
  };

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;
  const canContinue = allAnswered;

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((prev) => prev + 1);
    } else {
      evaluate();
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ((prev) => prev - 1);
  };

  const evaluate = async () => {
    const hasBlocking = BLOCKING_INDICES.some((i) => answers[i] === "oui");
    const hasWarning = WARNING_INDICES.some((i) => answers[i] === "oui");

    const eligibilityPassed = !hasBlocking;

    setSaving(true);
    const token = localStorage.getItem("deesse_token");
    if (token) {
      await supabase
        .from("declarations")
        .update({
          eligibility_passed: eligibilityPassed,
          eligibility_answers: answers as any,
          current_step: eligibilityPassed ? 1 : 0,
        })
        .eq("anonymous_token", token);
    }
    setSaving(false);

    if (hasBlocking) {
      setScreen("blocked");
    } else if (hasWarning) {
      setScreen("warning");
    } else {
      navigate("/etape/1");
    }
  };

  const progressPercent = ((currentQ + 1) / QUESTIONS.length) * 100;

  if (screen === "blocked") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-4">
          Accompagnement professionnel recommandé
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Votre situation nécessite l'accompagnement d'un professionnel. Déesse
          ne couvre pas encore ce type de dossier. Nous vous recommandons de
          contacter un notaire ou un avocat.
        </p>
        <Button onClick={() => navigate("/")} variant="outline" size="lg">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  if (screen === "warning") {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Alert className="border-accent bg-accent/5 mb-8">
          <AlertTriangle className="h-5 w-5 text-accent" />
          <AlertTitle className="font-heading text-lg">Attention</AlertTitle>
          <AlertDescription className="text-muted-foreground leading-relaxed">
            Votre situation comporte des éléments qui peuvent justifier
            l'accompagnement d'un professionnel. Vous pouvez continuer en mode
            dossier préparatoire, mais la validation finale par un notaire est
            fortement recommandée.
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <Button
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => navigate("/etape/1")}
          >
            Je comprends et je continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            Étape 0 sur 6
          </span>
          <span className="text-sm text-muted-foreground">
            Question {currentQ + 1} / {QUESTIONS.length}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
        Diagnostic préalable
      </h1>
      <p className="text-muted-foreground mb-8">
        Quelques questions pour vérifier que votre situation est compatible avec
        Déesse.
      </p>

      {/* Question card */}
      <Card className="mb-8">
        <CardContent className="p-6 md:p-8">
          <p className="text-lg font-medium mb-6 leading-relaxed">
            {QUESTIONS[currentQ]}
          </p>
          <RadioGroup
            value={answers[currentQ] ?? ""}
            onValueChange={(v) => handleAnswer(v as "oui" | "non")}
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="oui" id="oui" />
              <Label htmlFor="oui" className="text-base cursor-pointer">
                Oui
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="non" id="non" />
              <Label htmlFor="non" className="text-base cursor-pointer">
                Non
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentQ === 0}
        >
          Précédent
        </Button>
        {allAnswered && (
          <Button
            onClick={evaluate}
            disabled={saving}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Continuer
          </Button>
        )}
      </div>
    </div>
  );
};

export default Diagnostic;
