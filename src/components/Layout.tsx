import { Link, Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-primary px-4 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="font-serif text-2xl font-semibold text-accent">
            Déesse
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border px-4 py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Outil d'assistance administrative — Ne constitue pas un conseil juridique
        </div>
      </footer>
    </div>
  );
};

export default Layout;
