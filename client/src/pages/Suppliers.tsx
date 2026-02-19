import { trpc } from "@/lib/trpc";

export default function Suppliers() {
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fornecedores</h1>
      <p className="text-muted-foreground">{suppliers?.length || 0} fornecedores cadastrados</p>
    </div>
  );
}
