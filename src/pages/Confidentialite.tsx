import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

const sections: LegalSection[] = [
  { id: "responsable", title: "Responsable de traitement" },
  { id: "donnees", title: "Données collectées" },
  { id: "finalites", title: "Finalités et bases légales" },
  { id: "duree", title: "Durée de conservation" },
  { id: "destinataires", title: "Destinataires" },
  { id: "droits", title: "Droits de la personne concernée" },
  { id: "securite", title: "Sécurité" },
  { id: "cookies", title: "Cookies" },
  { id: "dpo", title: "Contact DPO" },
];

const Placeholder = () => (
  <p className="italic text-muted-foreground">[À rédiger par l'équipe juridique]</p>
);

const Confidentialite = () => (
  <LegalPageLayout
    pageTitle="Politique de confidentialité"
    breadcrumbCurrent="Confidentialité"
    sections={sections}
  >
    {sections.map((s, i) => (
      <section key={s.id} id={s.id} className="mb-8 scroll-mt-6">
        <h2 className="text-xl font-semibold mb-3">{i + 1}. {s.title}</h2>
        <Placeholder />
      </section>
    ))}
  </LegalPageLayout>
);

export default Confidentialite;
