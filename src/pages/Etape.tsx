import { useParams } from "react-router-dom";

const Etape = () => {
  const { numero } = useParams<{ numero: string }>();
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Étape {numero}</h1>
    </div>
  );
};
export default Etape;
