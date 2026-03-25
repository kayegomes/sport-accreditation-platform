import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Briefcase, Edit, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function JobFunctions() {
  const { user, loading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  const { data: functions, isLoading, refetch } = trpc.jobFunctions.list.useQuery(
    undefined,
    { enabled: !authLoading && user?.role === "admin" }
  );

  const createMutation = trpc.jobFunctions.create.useMutation({
    onSuccess: () => {
      toast.success("Função criada com sucesso!");
      refetch();
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar função: ${error.message}`);
    },
  });

  const updateMutation = trpc.jobFunctions.update.useMutation({
    onSuccess: () => {
      toast.success("Função atualizada com sucesso!");
      refetch();
      closeDialog();
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar função: ${error.message}`);
    },
  });

  const deleteMutation = trpc.jobFunctions.delete.useMutation({
    onSuccess: () => {
      toast.success("Função excluída com sucesso!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir função: ${error.message}`);
    },
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (func: any) => {
    setEditingId(func.id);
    setFormData({
      name: func.name,
      description: func.description || "",
      active: func.active,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome da função é obrigatório");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a função "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const filteredFunctions = functions?.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Acesso negado. Apenas administradores podem acessar esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Funções</h1>
            <p className="text-muted-foreground">Gerencie as funções de colaboradores no sistema</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Função
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Lista de Funções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8">Carregando funções...</div>
            ) : filteredFunctions && filteredFunctions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFunctions.map((func) => (
                      <TableRow key={func.id}>
                        <TableCell className="font-medium">{func.name}</TableCell>
                        <TableCell>{func.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={func.active ? "default" : "secondary"}>
                            {func.active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(func)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(func.id, func.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhuma função encontrada com esse critério de busca" : "Nenhuma função cadastrada"}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Função" : "Nova Função"}
                </DialogTitle>
                <DialogDescription>
                  {editingId
                    ? "Atualize as informações da função"
                    : "Preencha os dados da nova função"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nome <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descreva as responsabilidades desta função..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvando..."
                    : editingId
                    ? "Atualizar"
                    : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
