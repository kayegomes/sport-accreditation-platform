import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Reports() {
  const { user, loading: authLoading } = useAuth();
  const [reportType, setReportType] = useState<string>("collaborators_by_event");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const { data: events } = trpc.events.list.useQuery(
    undefined,
    { enabled: !authLoading && !!user }
  );

  const exportCollaboratorsByEvent = trpc.exports.exportCollaboratorsByEvent.useMutation({
    onSuccess: (data: any) => {
      toast.success("Relatório gerado com sucesso!");
      window.open(data.url, "_blank");
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    },
  });

  const exportAccreditationsByStatus = trpc.exports.exportAccreditationsByStatus.useMutation({
    onSuccess: (data: any) => {
      toast.success("Relatório gerado com sucesso!");
      window.open(data.url, "_blank");
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    },
  });

  const exportEventsByPeriod = trpc.exports.exportEventsByPeriod.useMutation({
    onSuccess: (data: any) => {
      toast.success("Relatório gerado com sucesso!");
      window.open(data.url, "_blank");
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    },
  });

  const handleGenerateReport = () => {
    if (reportType === "collaborators_by_event") {
      exportCollaboratorsByEvent.mutate({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } else if (reportType === "accreditations_by_status") {
      exportAccreditationsByStatus.mutate({
        eventId: selectedEventId ? parseInt(selectedEventId) : undefined,
      });
    } else if (reportType === "events_by_period") {
      if (!startDate || !endDate) {
        toast.error("Selecione o período para gerar o relatório");
        return;
      }
      exportEventsByPeriod.mutate({
        startDate,
        endDate,
      });
    }
  };

  const isGenerating = 
    exportCollaboratorsByEvent.isPending ||
    exportAccreditationsByStatus.isPending ||
    exportEventsByPeriod.isPending;

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Acesso negado. Faça login para acessar esta página.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios Personalizados</h1>
          <p className="text-muted-foreground">Gere relatórios customizados em formato Excel</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Gerador de Relatórios
            </CardTitle>
            <CardDescription>
              Selecione o tipo de relatório e os filtros desejados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reportType">Tipo de Relatório</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger id="reportType">
                    <SelectValue placeholder="Selecione o tipo de relatório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collaborators_by_event">
                      Colaboradores por Evento
                    </SelectItem>
                    <SelectItem value="accreditations_by_status">
                      Credenciamentos por Status
                    </SelectItem>
                    <SelectItem value="events_by_period">
                      Eventos por Período
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "accreditations_by_status" && (
                <div className="grid gap-2">
                  <Label htmlFor="eventId">Evento (opcional)</Label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger id="eventId">
                      <SelectValue placeholder="Todos os eventos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_EVENTS">Todos os eventos</SelectItem>
                      {events?.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(reportType === "collaborators_by_event" || reportType === "events_by_period") && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">
                      Data Inicial {reportType === "events_by_period" && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required={reportType === "events_by_period"}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">
                      Data Final {reportType === "events_by_period" && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required={reportType === "events_by_period"}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? "Gerando..." : "Gerar Relatório"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descrição dos Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Colaboradores por Evento</h3>
              <p className="text-sm text-muted-foreground">
                Lista todos os eventos com o total de colaboradores credenciados em cada um.
                Pode ser filtrado por período.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Credenciamentos por Status</h3>
              <p className="text-sm text-muted-foreground">
                Mostra a quantidade de credenciamentos agrupados por status (pendente, aprovado, rejeitado).
                Pode ser filtrado por evento específico.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Eventos por Período</h3>
              <p className="text-sm text-muted-foreground">
                Lista todos os eventos que ocorrem dentro de um período específico com suas informações completas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
