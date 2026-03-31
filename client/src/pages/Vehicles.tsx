import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Car } from "lucide-react";
import { toast } from "sonner";
import { VehicleForm } from "@/components/VehicleForm";

export default function Vehicles() {
  const { user } = useAuth();
  const { data: vehicles, isLoading } = trpc.vehicles.list.useQuery();
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.vehicles.delete.useMutation({
    onSuccess: () => {
      toast.success("Veículo excluído com sucesso!");
      utils.vehicles.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir veículo");
    },
  });

  const handleDelete = (id: number, model: string) => {
    if (confirm(`Tem certeza que deseja excluir o veículo "${model}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Veículos</h1>
        </div>
        <p className="text-muted-foreground">Carregando veículos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Veículos</h1>
          <p className="text-muted-foreground">
            Gerencie a frota de veículos para credenciamento
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'fornecedor') && (
          <Button onClick={() => {
            setSelectedVehicle(null);
            setFormOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Veículo
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles && vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{vehicle.model}</CardTitle>
                    <CardDescription className="uppercase font-mono font-bold">
                      {vehicle.plate}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Cor</p>
                    <p className="font-medium">{vehicle.color || "-"}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-muted-foreground">Tipo</p>
                    <Badge variant="secondary">{vehicle.type || "Geral"}</Badge>
                  </div>
                </div>

                {(user?.role === 'admin' || 
                  (user?.role === 'fornecedor' && user.supplierId === vehicle.supplierId)) && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setFormOpen(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(vehicle.id, vehicle.model)}
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
          <Card className="col-span-full border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum veículo cadastrado
            </CardContent>
          </Card>
        )}
      </div>

      <VehicleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={selectedVehicle}
      />
    </div>
  );
}
