import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, UserPlus, UserMinus, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EventAccess() {
  const { user, loading: authLoading } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const { data: events, isLoading: eventsLoading } = trpc.events.list.useQuery();
  const { data: suppliers, isLoading: suppliersLoading } = trpc.suppliers.list.useQuery();
  const { data: eventSuppliers, isLoading: eventSuppliersLoading, refetch } = 
    trpc.eventSuppliers.getEventSuppliers.useQuery(
      { eventId: selectedEventId! },
      { enabled: selectedEventId !== null }
    );

  const grantAccess = trpc.eventSuppliers.grantAccess.useMutation({
    onSuccess: () => {
      toast.success("Acesso concedido com sucesso!");
      refetch();
      setShowGrantDialog(false);
      setSelectedSupplierId("");
      setNotes("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao conceder acesso: ${error.message}`);
    },
  });

  const revokeAccess = trpc.eventSuppliers.revokeAccess.useMutation({
    onSuccess: () => {
      toast.success("Acesso revogado com sucesso!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erro ao revogar acesso: ${error.message}`);
    },
  });

  if (authLoading || eventsLoading || suppliersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Acesso Restrito
            </CardTitle>
            <CardDescription>
              Apenas administradores podem acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleGrantAccess = () => {
    if (!selectedEventId || !selectedSupplierId) {
      toast.error("Selecione um evento e um fornecedor");
      return;
    }

    grantAccess.mutate({
      eventId: selectedEventId,
      supplierId: parseInt(selectedSupplierId),
      notes: notes || undefined,
    });
  };

  const handleRevokeAccess = (supplierId: number) => {
    if (!selectedEventId) return;

    if (confirm("Tem certeza que deseja revogar o acesso deste fornecedor?")) {
      revokeAccess.mutate({
        eventId: selectedEventId,
        supplierId,
      });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controle de Acesso a Eventos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie quais fornecedores podem acessar cada evento
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione um Evento</CardTitle>
          <CardDescription>
            Escolha um evento para gerenciar os fornecedores com acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedEventId?.toString() || ""}
            onValueChange={(value) => setSelectedEventId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {events?.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.name} - {event.eventDate ? format(new Date(event.eventDate), "dd/MM/yyyy", { locale: ptBR }) : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEventId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fornecedores com Acesso</CardTitle>
                <CardDescription>
                  Lista de fornecedores autorizados a acessar este evento
                </CardDescription>
              </div>
              <Button onClick={() => setShowGrantDialog(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Conceder Acesso
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {eventSuppliersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : eventSuppliers && eventSuppliers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Concedido Por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventSuppliers.map((es) => (
                    <TableRow key={es.id}>
                      <TableCell className="font-medium">
                        {es.supplier?.name || "N/A"}
                      </TableCell>
                      <TableCell>{es.supplier?.cnpj || "-"}</TableCell>
                      <TableCell>
                        {es.active ? (
                          <Badge variant="default">Ativo</Badge>
                        ) : (
                          <Badge variant="destructive">Revogado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {es.grantedByUser?.name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(es.grantedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {es.active && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeAccess(es.supplierId)}
                            disabled={revokeAccess.isPending}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fornecedor com acesso a este evento
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conceder Acesso ao Evento</DialogTitle>
            <DialogDescription>
              Selecione um fornecedor para conceder acesso a este evento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Fornecedor</label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    ?.filter(s => s.active)
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Observações (opcional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo da concessão de acesso..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={grantAccess.isPending || !selectedSupplierId}
            >
              {grantAccess.isPending ? "Concedendo..." : "Conceder Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
