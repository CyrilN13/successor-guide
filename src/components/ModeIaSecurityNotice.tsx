import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Persistent security/privacy notice shown on Mode IA upload and revision pages.
 * Reflects B6.4: encrypted-at-rest storage, automatic deletion after validation,
 * only structured data is kept.
 */
const ModeIaSecurityNotice = () => (
  <Card className="mb-6 border-accent/40 bg-accent/5">
    <CardContent className="p-4 flex gap-3">
      <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
      <p className="text-sm text-foreground/80 leading-relaxed">
        Vos documents sont stockés de manière chiffrée pendant l'analyse. Ils
        sont automatiquement supprimés dès que vous validez les informations
        extraites. Seules les données structurées que vous confirmez sont
        conservées.
      </p>
    </CardContent>
  </Card>
);

export default ModeIaSecurityNotice;
