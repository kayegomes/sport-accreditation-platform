import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const collaboratorFormSchema = z.object({
  supplierId: z.number({ required_error: "Fornecedor é obrigatório" }),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  jobFunctionId: z.number().optional(),
  access: z.string().optional(),
  vehicleInfo: z.string().optional(),
  photoUrl: z.string().optional(),
});

type CollaboratorFormValues = z.infer<typeof collaboratorFormSchema>;

interface CollaboratorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator?: any;
}

export function CollaboratorForm({ open, onOpenChange, collaborator }: CollaboratorFormProps) {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const { data: jobFunctions } = trpc.jobFunctions.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery(undefined, {
    enabled: user?.role === 'admin' || (user?.role === 'gestor' && !user.supplierId),
  });
  
  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorFormSchema),
    defaultValues: collaborator ? {
      supplierId: collaborator.supplierId,
      name: collaborator.name,
      cpf: collaborator.cpf,
      email: collaborator.email,
      phone: collaborator.phone,
      jobFunctionId: collaborator.jobFunctionId || undefined,
      access: collaborator.access || "",
      vehicleInfo: collaborator.vehicleInfo || "",
      photoUrl: collaborator.photoUrl || "",
    } : {
      supplierId: user?.supplierId || undefined,
      name: "",
      cpf: "",
      email: "",
      phone: "",
      access: "",
      vehicleInfo: "",
      photoUrl: "",
    },
  });

  // Update default provider when user data loads
  if (!collaborator && !form.getValues("supplierId") && user?.supplierId) {
    form.setValue("supplierId", user.supplierId);
  }

  const createMutation = trpc.collaborators.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso!");
      utils.collaborators.list.invalidate();
      utils.dashboard.stats.invalidate();
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar colaborador");
    },
  });

  const updateMutation = trpc.collaborators.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      utils.collaborators.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar colaborador");
    },
  });

  const onSubmit = (data: CollaboratorFormValues) => {
    if (collaborator) {
      updateMutation.mutate({
        id: collaborator.id,
        ...data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{collaborator ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
          <DialogDescription>
            {collaborator ? "Atualize as informações do colaborador" : "Preencha os dados para cadastrar um novo colaborador"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {(user?.role === 'admin' || (user?.role === 'gestor' && !user.supplierId)) && (
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa / Fornecedor *</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(Number(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva Santos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="12345678901" 
                        maxLength={11}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>Apenas números</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="11999999999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="jobFunctionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(Number(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobFunctions?.map((func) => (
                          <SelectItem key={func.id} value={func.id.toString()}>
                            {func.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acesso</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Área de Transmissão" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vehicleInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações do Veículo</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Modelo, placa, cor (se aplicável)"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Foto</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>URL pública da foto do colaborador</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : collaborator
                  ? "Atualizar"
                  : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
