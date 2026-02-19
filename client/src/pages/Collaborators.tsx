import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";

export default function Collaborators() {
  const { data: collaborators, isLoading } = trpc.collaborators.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        <p className="text-muted-foreground">Gerencie colaboradores cadastrados</p>
      </div>
      {isLoading ? (
        <p>Carregando...</p>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            {collaborators?.length || 0} colaboradores encontrados
          </CardContent>
        </Card>
      )}
    </div>
  );
}
