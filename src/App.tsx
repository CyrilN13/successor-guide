import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import ChoixMode from "./pages/ChoixMode";
import Diagnostic from "./pages/Diagnostic";
import Etape1Defunt from "./pages/Etape1Defunt";
import Etape2Heritiers from "./pages/Etape2Heritiers";
import Etape3Actif from "./pages/Etape3Actif";
import Etape4Passif from "./pages/Etape4Passif";
import Etape5Donations from "./pages/Etape5Donations";
import Etape from "./pages/Etape";
import Synthese from "./pages/Synthese";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/choix-mode" element={<ChoixMode />} />
            <Route path="/diagnostic" element={<Diagnostic />} />
            <Route path="/etape/1" element={<Etape1Defunt />} />
            <Route path="/etape/2" element={<Etape2Heritiers />} />
            <Route path="/etape/3" element={<Etape3Actif />} />
            <Route path="/etape/4" element={<Etape4Passif />} />
            <Route path="/etape/5" element={<Etape5Donations />} />
            <Route path="/etape/6" element={<Synthese />} />
            <Route path="/etape/:numero" element={<Etape />} />
            <Route path="/synthese" element={<Synthese />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription" element={<Inscription />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
