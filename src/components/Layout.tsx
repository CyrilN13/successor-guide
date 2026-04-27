import { Link, Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-primary px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="font-serif text-2xl font-semibold text-accent">
            Déesse
          </Link>
        </div>
      </header>

      {!isHome && (
        <div className="border-b border-border bg-muted/40 px-4 py-2">
          <p className="container mx-auto text-center text-xs text-muted-foreground">
            Outil d'assistance administrative — ne constitue pas un conseil juridique.{" "}
            <Link to="/cgu" className="underline hover:text-foreground">CGU</Link>{" · "}
            <Link to="/mentions-legales" className="underline hover:text-foreground">Mentions légales</Link>
          </p>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card px-4 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Déesse — Outil d'assistance administrative</p>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link to="/cgu" className="hover:text-foreground">CGU</Link>
            <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
            <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
            <a href="mailto:contact@deesse.fr" className="hover:text-foreground">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
