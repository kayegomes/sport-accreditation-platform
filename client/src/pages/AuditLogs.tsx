import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, AlertCircle, Filter, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ActionType = "CREATE" | "UPDATE" | "DELETE" | "ALL";
type EntityType = "EVENT" | "COLLABORATOR" | "ACCREDITATION" | "SUPPLIER" | "JOB_FUNCTION" | "USER" | "ALL";

export default function AuditLogs() {
  const { user, loading: authLoading } = useAuth();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [actionFilter, setActionFilter] = useState<ActionType>("ALL");
  const [entityFilter, setEntityFilter] = useState<EntityType>("ALL");
  const [userFilter, setUserFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Fetch logs
  const { data: logs, isLoading } = trpc.auditLogs.list.useQuery(
    {
      action: actionFilter === "ALL" ? undefined : actionFilter,
      entityType: entityFilter === "ALL" ? undefined : entityFilter,
      userId: userFilter ? Number(userFilter) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
    { enabled: !authLoading && user?.role === "admin" }
  );

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    if (!logs) return [];
    const users = new Map<number, string>();
    logs.forEach(log => {
      if (log.userId && log.userName) {
        users.set(log.userId, log.userName);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }, [logs]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setActionFilter("ALL");
    setEntityFilter("ALL");
    setUserFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = actionFilter !== "ALL" || entityFilter !== "ALL" || userFilter || startDate || endDate;

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      CREATE: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return <Badge variant={variants[action] || "secondary"}>{action}</Badge>;
  };

  const getEntityBadge = (entity: string) => {
    return <Badge variant="outline">{entity}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatJSON = (data: any) => {
    if (!data) return "N/A";
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(data);
    }
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

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Apenas administradores podem acessar os logs de auditoria.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            Histórico completo de ações realizadas no sistema
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Refine a busca de logs</CardDescription>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Ação</label>
                <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as ActionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    <SelectItem value="CREATE">CREATE</SelectItem>
                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Entidade</label>
                <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as EntityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    <SelectItem value="EVENT">Evento</SelectItem>
                    <SelectItem value="COLLABORATOR">Colaborador</SelectItem>
                    <SelectItem value="ACCREDITATION">Credenciamento</SelectItem>
                    <SelectItem value="SUPPLIER">Fornecedor</SelectItem>
                    <SelectItem value="JOB_FUNCTION">Função</SelectItem>
                    <SelectItem value="USER">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Usuário</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {uniqueUsers.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registros de Auditoria</CardTitle>
            <CardDescription>
              {logs?.length || 0} registro(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando logs...
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <>
                        <TableRow key={log.id} className="cursor-pointer hover:bg-accent">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(log.id)}
                            >
                              {expandedRows.has(log.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{log.userName}</div>
                            <div className="text-xs text-muted-foreground">ID: {log.userId}</div>
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell>{getEntityBadge(log.entityType)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.entityId || "N/A"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.ipAddress || "N/A"}
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(log.id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/50">
                              <div className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold mb-2 text-sm">Dados Anteriores</h4>
                                    <pre className="bg-background p-3 rounded border text-xs overflow-x-auto">
                                      {log.details ? formatJSON(log.details) : "N/A"}
                                    </pre>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2 text-sm">Detalhes da Alteração</h4>
                                    <pre className="bg-background p-3 rounded border text-xs overflow-x-auto">
                                      {log.details ? formatJSON(log.details) : "N/A"}
                                    </pre>
                                  </div>
                                </div>
                                {log.userAgent && (
                                  <div>
                                    <h4 className="font-semibold mb-1 text-sm">User Agent</h4>
                                    <p className="text-xs text-muted-foreground">{log.userAgent}</p>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
