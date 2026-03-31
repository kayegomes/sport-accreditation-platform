import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Car, FileText, Search, Building2, Users } from "lucide-react";
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

  const totalVehicles = vehicles?.length || 0;
  const activeVehicles = vehicles?.filter(v => v.active).length || 0;
  const supplierCount = new Set(vehicles?.map(v => v.supplierId)).size;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Car className="w-8 h-8 text-blue-600" />
            Veículos
          </h1>
          <p className="text-muted-foreground mt-1 text-slate-500">
            Gerencie os veículos cadastrados por fornecedor
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-slate-200">
            <FileText className="w-4 h-4" />
            Template Excel
          </Button>
          <Button variant="outline" className="gap-2 border-slate-200">
            <Plus className="w-4 h-4" />
            Importar Lote
          </Button>
          {(user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'fornecedor') && (
            <Button 
              className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100"
              onClick={() => {
                setSelectedVehicle(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Novo Veículo
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 leading-none">{totalVehicles}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Total de Veículos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 leading-none">{activeVehicles}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Ativos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800 leading-none">{supplierCount}</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Fornecedores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-0 pt-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por placa, modelo, marca ou fornecedor..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="text-slate-800 font-bold mb-4">{totalVehicles} veículos encontrados</div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-slate-500 text-sm font-medium">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100">Placa</th>
                <th className="px-6 py-4 border-b border-slate-100">Modelo / Marca</th>
                <th className="px-6 py-4 border-b border-slate-100">Cor</th>
                <th className="px-6 py-4 border-b border-slate-100">Ano</th>
                <th className="px-6 py-4 border-b border-slate-100">Fornecedor</th>
                <th className="px-6 py-4 border-b border-slate-100 text-center">Status</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600 divide-y divide-slate-50">
              {vehicles?.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{vehicle.plate}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 uppercase">{vehicle.model}</div>
                    <div className="text-xs text-slate-400 uppercase">{vehicle.brand || "Marca"}</div>
                  </td>
                  <td className="px-6 py-4">{vehicle.color || "Preto"}</td>
                  <td className="px-6 py-4">{vehicle.year || "2020"}</td>
                  <td className="px-6 py-4 font-medium">{vehicle.supplierName || "ESPN Brasil"}</td>
                  <td className="px-6 py-4 text-center">
                    <Badge className={vehicle.active ? "bg-blue-600" : "bg-slate-400"}>
                      Ativo
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setFormOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={() => handleDelete(vehicle.id, vehicle.model)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!vehicles || vehicles.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    Nenhum veículo encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <VehicleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={selectedVehicle}
      />
    </div>
  );
}
