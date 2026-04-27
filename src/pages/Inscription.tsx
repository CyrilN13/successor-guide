import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const Inscription = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedCgu, setAcceptedCgu] = useState(false);
  const [declaredNoNotary, setDeclaredNoNotary] = useState(false);
  const [acceptedResponsibility, setAcceptedResponsibility] = useState(false);
  const [loading, setLoading] = useState(false);

  const allAccepted = acceptedCgu && declaredNoNotary && acceptedResponsibility;
  const canSubmit = email.trim() && password.length >= 6 && allAccepted && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        await supabase.from("profiles").upsert({
          id: userId,
          email: email.trim(),
          accepted_cgu: true,
          accepted_privacy: true,
          declared_no_notary: true,
          accepted_responsibility: true,
        });
      }

      toast({ title: "Compte créé", description: "Vérifiez votre boîte mail pour confirmer votre adresse." });
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Erreur lors de l'inscription",
        description: err?.message ?? "Réessayez dans un instant.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <h1 className="font-serif text-3xl font-bold text-center mb-2">Créer un compte</h1>
      <p className="text-center text-muted-foreground mb-8">
        Conservez votre dossier et reprenez-le à tout moment.
      </p>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Minimum 6 caractères.</p>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={acceptedCgu}
                  onCheckedChange={(v) => setAcceptedCgu(v === true)}
                  className="mt-0.5"
                />
                <span>
                  J'accepte les{" "}
                  <Link to="/cgu" className="underline hover:text-accent">Conditions Générales d'Utilisation</Link>{" "}
                  et la{" "}
                  <Link to="/confidentialite" className="underline hover:text-accent">politique de confidentialité</Link>.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={declaredNoNotary}
                  onCheckedChange={(v) => setDeclaredNoNotary(v === true)}
                  className="mt-0.5"
                />
                <span>Je déclare ne pas avoir mandaté de notaire pour cette succession.</span>
              </label>

              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={acceptedResponsibility}
                  onCheckedChange={(v) => setAcceptedResponsibility(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Je reconnais que Déesse est un outil d'assistance technique et non un service juridique.
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading ? "Création..." : "Créer mon compte"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link to="/connexion" className="underline hover:text-accent">Se connecter</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inscription;
