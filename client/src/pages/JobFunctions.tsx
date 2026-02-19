import { trpc } from "@/lib/trpc";

export default function JobFunctions() {
  const { data: functions } = trpc.jobFunctions.list.useQuery();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Funções</h1>
      <p className="text-muted-foreground">{functions?.length || 0} funções cadastradas</p>
    </div>
  );
}
