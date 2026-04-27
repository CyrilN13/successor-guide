import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface LegalSection {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  pageTitle: string;
  breadcrumbCurrent: string;
  sections: LegalSection[];
  children: React.ReactNode;
}

const LegalPageLayout = ({ pageTitle, breadcrumbCurrent, sections, children }: LegalPageLayoutProps) => {
  return (
    <div className="container mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Accueil</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{breadcrumbCurrent}</span>
      </nav>

      <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">{pageTitle}</h1>

      <div className="grid gap-10 md:grid-cols-[260px_1fr]">
        {/* TOC */}
        <aside className="md:sticky md:top-6 md:self-start">
          <nav aria-label="Table des matières" className="rounded-md border border-border bg-card p-4">
            <p className="mb-3 font-serif text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sommaire
            </p>
            <ol className="space-y-2 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-foreground hover:text-accent">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        {/* Content */}
        <article className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground">
          {children}
        </article>
      </div>
    </div>
  );
};

export default LegalPageLayout;
