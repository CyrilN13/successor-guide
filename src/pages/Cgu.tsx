import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

const sections: LegalSection[] = [
  { id: "objet", title: "Objet de la plateforme" },
  { id: "acceptation", title: "Acceptation des conditions" },
  { id: "description", title: "Description du service" },
  { id: "engagements", title: "Engagements de l'utilisateur" },
  { id: "responsabilite", title: "Limites de responsabilité" },
  { id: "propriete", title: "Propriété intellectuelle" },
  { id: "tarifs", title: "Modèle économique et tarifs" },
  { id: "resiliation", title: "Résiliation et conservation des données" },
  { id: "droit", title: "Droit applicable et juridiction" },
];

const Placeholder = () => (
  <p className="italic text-muted-foreground">[À rédiger par l'équipe juridique]</p>
);

const Cgu = () => (
  <LegalPageLayout pageTitle="Conditions Générales d'Utilisation" breadcrumbCurrent="CGU" sections={sections}>
    {sections.map((s, i) => (
      <section key={s.id} id={s.id} className="mb-8 scroll-mt-6">
        <h2 className="text-xl font-semibold mb-3">{i + 1}. {s.title}</h2>
        <Placeholder />
      </section>
    ))}
  </LegalPageLayout>
);

export default Cgu;
