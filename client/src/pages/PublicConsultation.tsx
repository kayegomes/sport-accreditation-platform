import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicConsultation() {
  const [cpf, setCpf] = useState("");
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Consulta Pública de Credenciamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            placeholder="Digite o CPF" 
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
          />
          <Button className="w-full">Consultar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
