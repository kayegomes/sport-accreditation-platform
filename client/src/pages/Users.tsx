import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, UserCog, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function Users() {
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>("");
  const [newSupplierId, setNewSupplierId] = useState<string>("null");

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setNewSupplierId(user.supplierId?.toString() || "null");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    
    updateMutation.mutate({
      id: selectedUser.id,
      role: newRole as any,
      supplierId: newSupplierId === "null" ? null : Number(newSupplierId),
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Controle de acesso e permissões do sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Ativos</CardTitle>
          <CardDescription>
            Lista de todos os usuários que já acessaram a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name || "Sem Nome"}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.supplierId ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="text-sm">
                          {suppliers?.find(s => s.id === user.supplierId)?.name || 'Carregando...'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Nenhum</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.lastSignedIn).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                      <UserCog className="h-4 w-4 mr-2" />
                      Gerenciar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Usuário</DialogTitle>
            <DialogDescription>
              Ajuste as permissões de <strong>{selectedUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo (Role)</label>
              <Select onValueChange={setNewRole} value={newRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="consulta">Consulta / Auditoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRole === 'fornecedor' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa / Fornecedor</label>
                <Select onValueChange={setNewSupplierId} value={newSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular a uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Nenhuma (Acesso Geral)</SelectItem>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
