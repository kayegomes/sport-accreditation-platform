import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { CollaboratorForm } from "@/components/CollaboratorForm";

export default function Collaborators() {
  const { user } = useAuth();
  const { data: collaborators, isLoading } = trpc.collaborators.list.useQuery();
  const [selectedCollaborator, setSelectedCollaborator] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.collaborators.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador excluído com sucesso!");
      utils.collaborators.list.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir colaborador");
    },
  });

  const handleDelete = (collaboratorId: number, collaboratorName: string) => {
    if (confirm(`Tem certeza que deseja excluir o colaborador "${collaboratorName}"?`)) {
      deleteMutation.mutate({ id: collaboratorId });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Colaboradores</h1>
        </div>
        <p className="text-muted-foreground">Carregando colaboradores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground">
            Gerencie colaboradores e equipes
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'fornecedor') && (
          <Button onClick={() => {
            setSelectedCollaborator(null);
            setFormOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collaborators && collaborators.length > 0 ? (
          collaborators.map((collaborator) => (
            <Card key={collaborator.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {collaborator.photoUrl ? (
                      <img 
                        src={collaborator.photoUrl} 
                        alt={collaborator.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{collaborator.name}</CardTitle>
                    <CardDescription className="truncate">
                      CPF: {collaborator.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{collaborator.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Telefone</p>
                    <p className="font-medium">{collaborator.phone}</p>
                  </div>
                  {collaborator.defaultJobFunctionId && (
                    <div>
                      <p className="text-muted-foreground">Função ID</p>
                      <Badge variant="outline">{collaborator.defaultJobFunctionId}</Badge>
                    </div>
                  )}
                  {collaborator.vehicleInfo && (
                    <div>
                      <p className="text-muted-foreground">Veículo</p>
                      <p className="font-medium text-xs">{collaborator.vehicleInfo}</p>
                    </div>
                  )}
                </div>

                {(user?.role === 'admin' || 
                  (user?.role === 'fornecedor' && user.supplierId === collaborator.supplierId)) && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedCollaborator(collaborator);
                        setFormOpen(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(collaborator.id, collaborator.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum colaborador cadastrado
            </CardContent>
          </Card>
        )}
      </div>

      <CollaboratorForm
        open={formOpen}
        onOpenChange={setFormOpen}
        collaborator={selectedCollaborator}
      />
    </div>
  );
}
