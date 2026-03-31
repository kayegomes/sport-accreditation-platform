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
import { Shield, UserCog, Building2, Plus, Users as UsersIcon, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Users() {
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>("fornecedor");
  const [newSupplierId, setNewSupplierId] = useState<string>("null");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  const resetForm = () => {
    setSelectedUser(null);
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("fornecedor");
    setNewSupplierId("null");
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setNewName(user.name || "");
    setNewEmail(user.email || "");
    setNewRole(user.role);
    setNewSupplierId(user.supplierId?.toString() || "null");
    setNewPassword("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedUser) {
      updateMutation.mutate({
        id: selectedUser.id,
        role: newRole as any,
        supplierId: newSupplierId === "null" ? null : Number(newSupplierId),
      });
    } else {
      if (!newName || !newEmail || !newPassword) {
        toast.error("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      createMutation.mutate({
        name: newName,
        email: newEmail,
        role: newRole as any,
        supplierId: newSupplierId === "null" ? null : Number(newSupplierId),
        password: newPassword,
      });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando usuários...</div>;
  }

  const totalUsers = users?.length || 0;
  const adminCount = users?.filter(u => u.role === 'admin').length || 0;
  const gestorCount = users?.filter(u => u.role === 'gestor').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Usuários</h1>
          <p className="text-muted-foreground mt-1 text-slate-500">
            Gerencie os usuários e permissões de acesso ao sistema
          </p>
        </div>
        <Button 
          className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100"
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 leading-none">{totalUsers}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Total de Usuários</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 leading-none">{adminCount}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Administradores</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 leading-none">{gestorCount}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Gestores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-800">Lista de Usuários</CardTitle>
          <CardDescription>
            {totalUsers} usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="px-6">Usuário</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                          {user.name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-slate-700">{user.name || "Sem Nome"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge className={
                      user.role === 'admin' ? 'bg-blue-600 hover:bg-blue-700' : 
                      user.role === 'gestor' ? 'bg-pink-600 hover:bg-pink-700' : 
                      'bg-slate-500 hover:bg-slate-600'
                    }>
                      {user.role.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.supplierId ? (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium">
                          {suppliers?.find(s => s.id === user.supplierId)?.name || 'SportTV'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">SISTEMA</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">
                    {new Date(user.lastSignedIn).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-blue-600 border-blue-100 bg-blue-50/50">
                      Ativo
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <input 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Nome do usuário"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={selectedUser && selectedUser.loginMethod !== 'password'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <input 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={selectedUser && selectedUser.loginMethod !== 'password'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Perfil de Acesso</label>
                <Select onValueChange={setNewRole} value={newRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="consulta">Consulta / Auditoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(newRole === 'fornecedor' || newRole === 'gestor') && (
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

            {!selectedUser && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <input 
                    type="password"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="******"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmar Senha</label>
                  <input 
                    type="password"
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="******"
                  />
                </div>
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
