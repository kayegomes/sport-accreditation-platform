import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, UserPlus, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Accreditations() {
  const { user, loading: authLoading } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollaborators, setSelectedCollaborators] = useState<number[]>([]);
  const [selectedAccreditations, setSelectedAccreditations] = useState<number[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<number[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch data
  const { data: events } = trpc.events.list.useQuery(undefined, { enabled: !authLoading });
  const { data: collaborators } = trpc.collaborators.list.useQuery(undefined, { enabled: !authLoading });
  const { data: jobFunctions } = trpc.jobFunctions.list.useQuery(undefined, { enabled: !authLoading });
  const { data: accreditations, refetch: refetchAccreditations } = trpc.accreditations.listByEvent.useQuery(
    { eventId: selectedEventId! },
    { enabled: !!selectedEventId }
  );
  const { data: functionLimits } = trpc.events.getFunctionLimits.useQuery(
    { eventId: selectedEventId! },
    { enabled: !!selectedEventId }
  );

  // Mutations
  const createAccreditation = trpc.accreditations.create.useMutation({
    onSuccess: () => {
      toast.success("Credenciamento realizado com sucesso!");
      refetchAccreditations();
      setSelectedCollaborators([]);
      setShowConfirmDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao credenciar colaborador");
    },
  });

  const removeAccreditation = trpc.accreditations.delete.useMutation({
    onSuccess: () => {
      toast.success("Credenciamento removido com sucesso!");
      refetchAccreditations();
      setSelectedAccreditations(prev => prev.filter(id => !accreditations?.find(a => a.id === id)));
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover credenciamento");
    },
  });

  const updateAccreditationStatus = trpc.accreditations.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      refetchAccreditations();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const bulkUpdateStatus = (status: "aprovado" | "rejeitado" | "credenciado") => {
    if (selectedAccreditations.length === 0 && selectedVehicles.length === 0) return;
    
    const allToUpdate = [...new Set([...selectedAccreditations, ...selectedVehicles])];
    
    Promise.all(
      allToUpdate.map(id => updateAccreditationStatus.mutateAsync({ id, status }))
    ).then(() => {
      toast.success(`${allToUpdate.length} credenciamentos atualizados para ${status}`);
      setSelectedAccreditations([]);
      setSelectedVehicles([]);
    });
  };

  // Get selected event
  const selectedEvent = events?.find(e => e.id === selectedEventId);

  // Filter collaborators
  const filteredCollaborators = useMemo(() => {
    if (!collaborators) return [];
    
    // Filter by search term
    let filtered = collaborators.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter out already accredited
    const accreditedIds = new Set(accreditations?.map(a => a.collaboratorId) || []);
    filtered = filtered.filter(c => !accreditedIds.has(c.id));

    return filtered;
  }, [collaborators, searchTerm, accreditations]);

  // Calculate function usage
  const functionUsage = useMemo(() => {
    if (!accreditations || !functionLimits) return {};
    
    const usage: Record<number, { current: number; max: number; name: string }> = {};
    
    functionLimits.forEach(limit => {
      const func = jobFunctions?.find(f => f.id === limit.jobFunctionId);
      usage[limit.jobFunctionId] = {
        current: accreditations.filter(a => a.jobFunctionId === limit.jobFunctionId).length,
        max: limit.maxCount,
        name: func?.name || "Desconhecida",
      };
    });
    
    return usage;
  }, [accreditations, functionLimits, jobFunctions]);

  // Check if can add more for a function
  const canAddFunction = (functionId: number | null) => {
    if (!functionId || !functionUsage[functionId]) return true;
    const { current, max } = functionUsage[functionId];
    return current < max;
  };

  // Check if registration is closed
  const isRegistrationClosed = useMemo(() => {
    if (!selectedEvent) return false;
    const now = new Date();
    const deadline = new Date(selectedEvent.registrationDeadline);
    deadline.setHours(23, 59, 59, 999);
    return now > deadline || selectedEvent.status !== 'aberto';
  }, [selectedEvent]);

  const canAction = user?.role === 'admin' || !isRegistrationClosed;

  // Handle credential
  const handleCredential = () => {
    if (!selectedEventId || selectedCollaborators.length === 0) return;
    if (!canAction) {
      toast.error("O prazo de cadastro para este evento já encerrou.");
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmCredential = () => {
    if (!selectedEventId) return;
    
    selectedCollaborators.forEach(collabId => {
      const collab = collaborators?.find(c => c.id === collabId);
      if (!collab) return;
      
      createAccreditation.mutate({
        eventId: selectedEventId,
        collaboratorId: collabId,
        jobFunctionId: collab.defaultJobFunctionId ?? 0,
      });
    });
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (user?.role === "consulta") {
    return (
      <DashboardLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta página.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Credenciamentos</h1>
          <p className="text-muted-foreground">
            Vincule colaboradores a eventos esportivos
          </p>
        </div>

        {/* Event Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecione o Evento</CardTitle>
            <CardDescription>Escolha o evento para gerenciar credenciamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEventId?.toString() || ""} onValueChange={(v) => setSelectedEventId(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um evento..." />
              </SelectTrigger>
              <SelectContent>
                {events?.filter(e => e.active).map(event => {
                  const deadline = new Date(event.registrationDeadline);
                  deadline.setHours(23, 59, 59, 999);
                  const closed = new Date() > deadline || event.status !== 'aberto';
                  
                  return (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{event.name} - {new Date(event.eventDate).toLocaleDateString("pt-BR")}</span>
                        {closed && <Badge variant="secondary" className="text-[10px] h-4">Prazo Encerrado</Badge>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEventId && (
          <>
            {isRegistrationClosed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O prazo de cadastro para este evento encerrou em {new Date(selectedEvent?.registrationDeadline || "").toLocaleDateString("pt-BR")}. 
                  {user?.role === 'admin' ? " Como administrador, você ainda pode realizar alterações." : " Somente administradores podem realizar novos credenciamentos agora."}
                </AlertDescription>
              </Alert>
            )}

            {/* Function Limits Overview */}
            {Object.keys(functionUsage).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Limites de Função</CardTitle>
                  <CardDescription>Vagas disponíveis por função neste evento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(functionUsage).map(([funcId, data]) => {
                      const percentage = (data.current / data.max) * 100;
                      const isNearLimit = percentage >= 80;
                      const isFull = percentage >= 100;
                      
                      return (
                        <div key={funcId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{data.name}</span>
                            <Badge variant={isFull ? "destructive" : isNearLimit ? "secondary" : "default"}>
                              {data.current}/{data.max}
                            </Badge>
                          </div>
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                isFull ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-primary"
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collaborator Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Adicionar Colaboradores</CardTitle>
                    <CardDescription>
                      Selecione os colaboradores para credenciar ({selectedCollaborators.length} selecionados)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {filteredCollaborators.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const allPossibleIds = filteredCollaborators
                            .filter(c => canAddFunction(c.defaultJobFunctionId))
                            .map(c => c.id);
                          
                          if (selectedCollaborators.length === allPossibleIds.length) {
                            setSelectedCollaborators([]);
                          } else {
                            setSelectedCollaborators(allPossibleIds);
                          }
                        }}
                      >
                        {selectedCollaborators.length === filteredCollaborators.filter(c => canAddFunction(c.defaultJobFunctionId)).length 
                          ? "Desmarcar Todos" 
                          : "Selecionar Todos"}
                      </Button>
                    )}
                    {selectedCollaborators.length > 0 && (
                      <Button onClick={handleCredential}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Credenciar Selecionados
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCollaborators.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum colaborador disponível para credenciamento
                    </div>
                  ) : (
                    filteredCollaborators.map(collab => {
                      const func = jobFunctions?.find(f => f.id === collab.defaultJobFunctionId);
                      const canAdd = canAddFunction(collab.defaultJobFunctionId);
                      
                      return (
                        <div 
                          key={collab.id} 
                          className={`flex items-center gap-4 p-3 border rounded-lg ${
                            (!canAdd || !canAction) ? "opacity-50 bg-muted" : "hover:bg-accent cursor-pointer"
                          }`}
                          onClick={() => {
                            if (!canAdd || !canAction) return;
                            setSelectedCollaborators(prev => 
                              prev.includes(collab.id) 
                                ? prev.filter(id => id !== collab.id)
                                : [...prev, collab.id]
                            );
                          }}
                        >
                          <Checkbox 
                            checked={selectedCollaborators.includes(collab.id)}
                            disabled={!canAdd || !canAction}
                            onCheckedChange={(checked) => {
                              if (!canAdd || !canAction) return;
                              setSelectedCollaborators(prev => 
                                checked 
                                  ? [...prev, collab.id]
                                  : prev.filter(id => id !== collab.id)
                              );
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{collab.name}</div>
                            <div className="text-sm text-muted-foreground">
                              CPF: {collab.cpf} • {collab.email}
                            </div>
                          </div>
                          {func && (
                            <Badge variant={canAdd ? "outline" : "secondary"}>
                              {func.name}
                              {!canAdd && " (Limite atingido)"}
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Credenciar Veículos</CardTitle>
                    <CardDescription>
                      Selecione os veículos (via colaboradores) para credenciar ({selectedVehicles.length} selecionados)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {filteredCollaborators.filter(c => c.vehicleInfo).length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const vehicleEnabledCollabs = filteredCollaborators
                            .filter(c => c.vehicleInfo && canAddFunction(c.defaultJobFunctionId))
                            .map(c => c.id);
                          
                          if (selectedVehicles.length === vehicleEnabledCollabs.length) {
                            setSelectedVehicles([]);
                          } else {
                            setSelectedVehicles(vehicleEnabledCollabs);
                          }
                        }}
                      >
                        {selectedVehicles.length === filteredCollaborators.filter(c => c.vehicleInfo && canAddFunction(c.defaultJobFunctionId)).length 
                          ? "Desmarcar Todos" 
                          : "Selecionar Todos"}
                      </Button>
                    )}
                    {selectedVehicles.length > 0 && (
                      <Button onClick={() => {
                        setSelectedCollaborators(selectedVehicles);
                        handleCredential();
                      }}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Credenciar Veículos Selecionados
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredCollaborators.filter(c => c.vehicleInfo).length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum veículo disponível para credenciamento
                    </div>
                  ) : (
                    filteredCollaborators.filter(c => c.vehicleInfo).map(collab => {
                      const canAdd = canAddFunction(collab.defaultJobFunctionId);
                      return (
                        <div 
                          key={`vehicle-${collab.id}`} 
                          className={`flex items-center gap-4 p-3 border rounded-lg ${
                            (!canAdd || !canAction) ? "opacity-50 bg-muted" : "hover:bg-accent cursor-pointer"
                          }`}
                          onClick={() => {
                            if (!canAdd || !canAction) return;
                            setSelectedVehicles(prev => 
                              prev.includes(collab.id) 
                                ? prev.filter(id => id !== collab.id)
                                : [...prev, collab.id]
                            );
                          }}
                        >
                          <Checkbox 
                            checked={selectedVehicles.includes(collab.id)}
                            disabled={!canAdd || !canAction}
                            onCheckedChange={(checked) => {
                              if (!canAdd || !canAction) return;
                              setSelectedVehicles(prev => 
                                checked 
                                  ? [...prev, collab.id]
                                  : prev.filter(id => id !== collab.id)
                              );
                            }}
                          />
                          <div className="flex-1">
                            <div className="font-medium">Veículo: {collab.vehicleInfo}</div>
                            <div className="text-sm text-muted-foreground">
                              Condutor: {collab.name}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Already Accredited */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Aprovação de Credenciados</CardTitle>
                    <CardDescription>
                      {accreditations?.length || 0} colaboradores cadastrados ({selectedAccreditations.length} selecionados)
                    </CardDescription>
                  </div>
                  {user?.role === "admin" && (
                    <div className="flex gap-2">
                       {accreditations && accreditations.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (selectedAccreditations.length === accreditations.length) {
                              setSelectedAccreditations([]);
                            } else {
                              setSelectedAccreditations(accreditations.map(a => a.id));
                            }
                          }}
                        >
                          {selectedAccreditations.length === accreditations.length 
                            ? "Desmarcar Todos" 
                            : "Selecionar Todos"}
                        </Button>
                      )}
                      {selectedAccreditations.length > 0 && (
                        <>
                          <Button size="sm" onClick={() => bulkUpdateStatus("aprovado")}>
                            Aprovar Selecionados
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => bulkUpdateStatus("rejeitado")}>
                            Rejeitar Selecionados
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {!accreditations || accreditations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum colaborador credenciado ainda
                    </div>
                  ) : (
                    accreditations.map(accred => {
                      const collab = collaborators?.find(c => c.id === accred.collaboratorId);
                      const func = jobFunctions?.find(f => f.id === accred.jobFunctionId);
                      
                      if (!collab) return null;
                      
                      return (
                        <div key={accred.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          {user?.role === "admin" && (
                            <Checkbox 
                              checked={selectedAccreditations.includes(accred.id)}
                              onCheckedChange={(checked) => {
                                setSelectedAccreditations(prev => 
                                  checked 
                                    ? [...prev, accred.id]
                                    : prev.filter(id => id !== accred.id)
                                );
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{collab.name}</div>
                            <div className="text-sm text-muted-foreground">
                              CPF: {collab.cpf}
                            </div>
                          </div>
                          {func && <Badge variant="outline">{func.name}</Badge>}
                          <Badge variant={
                            accred.status === "aprovado" ? "default" : 
                            accred.status === "pendente" ? "secondary" : "destructive"
                          }>
                            {accred.status}
                          </Badge>
                          {user?.role === "admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Deseja remover este credenciamento?")) {
                                  removeAccreditation.mutate({ id: accred.id });
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Credenciamento</DialogTitle>
              <DialogDescription>
                Você está prestes a credenciar {selectedCollaborators.length} colaborador(es) para o evento:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="font-medium">{selectedEvent?.name}</div>
              <div className="text-sm text-muted-foreground">
                Data: {selectedEvent && new Date(selectedEvent.eventDate).toLocaleDateString("pt-BR")}
              </div>
              <div className="text-sm text-muted-foreground">
                Local: {selectedEvent?.location}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmCredential} disabled={createAccreditation.isPending}>
                {createAccreditation.isPending ? "Credenciando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
