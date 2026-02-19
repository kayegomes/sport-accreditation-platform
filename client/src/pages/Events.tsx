import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Events() {
  const { user } = useAuth();
  const { data: events, isLoading } = trpc.events.list.useQuery();
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      aberto: { label: "Aberto", variant: "default" },
      em_verificacao: { label: "Em Verificação", variant: "secondary" },
      extraido: { label: "Extraído", variant: "outline" },
      enviado: { label: "Enviado", variant: "outline" },
      concluido: { label: "Concluído", variant: "secondary" },
    };
    
    const config = variants[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Eventos</h1>
        </div>
        <p className="text-muted-foreground">Carregando eventos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-muted-foreground">
            Gerencie eventos esportivos e credenciamento
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Evento
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {events && events.length > 0 ? (
          events.map((event) => (
            <Card key={event.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{event.name}</CardTitle>
                    <CardDescription>
                      {event.location && `${event.location} • `}
                      {new Date(event.eventDate).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(event.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {event.wo && (
                    <div>
                      <p className="text-muted-foreground">WO</p>
                      <p className="font-medium">{event.wo}</p>
                    </div>
                  )}
                  {event.federation && (
                    <div>
                      <p className="text-muted-foreground">Federação</p>
                      <p className="font-medium">{event.federation}</p>
                    </div>
                  )}
                  {event.eventType && (
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">{event.eventType}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Prazo de Cadastro</p>
                    <p className="font-medium">
                      {new Date(event.registrationDeadline).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum evento cadastrado
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
