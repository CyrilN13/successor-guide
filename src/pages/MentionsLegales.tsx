import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

const sections: LegalSection[] = [
  { id: "editeur", title: "Éditeur du site" },
  { id: "hebergeur", title: "Hébergeur" },
  { id: "contact", title: "Contact" },
  { id: "siret", title: "Identification" },
];

const MentionsLegales = () => (
  <LegalPageLayout pageTitle="Mentions légales" breadcrumbCurrent="Mentions légales" sections={sections}>
    <section id="editeur" className="mb-8 scroll-mt-6">
      <h2 className="text-xl font-semibold mb-3">1. Éditeur du site</h2>
      <p>Déesse — plateforme d'assistance à la déclaration de succession.</p>
      <p className="italic text-muted-foreground">[À compléter] — Raison sociale, forme juridique, adresse du siège, capital social.</p>
    </section>

    <section id="hebergeur" className="mb-8 scroll-mt-6">
      <h2 className="text-xl font-semibold mb-3">2. Hébergeur</h2>
      <p>
        Le site est hébergé par <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapore 318992.
      </p>
    </section>

    <section id="contact" className="mb-8 scroll-mt-6">
      <h2 className="text-xl font-semibold mb-3">3. Contact</h2>
      <p className="italic text-muted-foreground">[À compléter] — Adresse e-mail de contact, téléphone.</p>
    </section>

    <section id="siret" className="mb-8 scroll-mt-6">
      <h2 className="text-xl font-semibold mb-3">4. Identification</h2>
      <p>N° SIRET : <span className="italic text-muted-foreground">[À compléter]</span></p>
      <p>N° TVA intracommunautaire : <span className="italic text-muted-foreground">[À compléter]</span></p>
      <p>Directeur de la publication : <span className="italic text-muted-foreground">[À compléter]</span></p>
    </section>
  </LegalPageLayout>
);

export default MentionsLegales;
