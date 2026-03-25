import { useState, useRef } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  onSuccess: () => void;
}

interface PreviewRow {
  name: string;
  cpf: string;
  jobFunctionName: string;
  supplierName: string;
  errors: string[];
  valid: boolean;
}

export default function BatchImportModal({ isOpen, onClose, eventId, onSuccess }: BatchImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadBatchFile = trpc.batchImports.uploadBatchFile.useMutation({
    onSuccess: (data: any) => {
      // After upload, process the import
      processBatchImport.mutate({ batchImportId: data.batchImportId });
    },
    onError: (error: any) => {
      toast.error(`Erro no upload: ${error.message}`);
    },
  });

  const processBatchImport = trpc.batchImports.processBatchImport.useMutation({
    onSuccess: () => {
      toast.success("Importação concluída com sucesso!");
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setShowPreview(false);
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Tipo de arquivo inválido. Use Excel (.xlsx) ou CSV (.csv)");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 5MB");
      return;
    }

    setFile(selectedFile);
    
    // Parse file and generate preview
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await selectedFile.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      const rows: PreviewRow[] = [];
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const name = row.getCell(1).value?.toString() || "";
        const cpf = row.getCell(2).value?.toString() || "";
        const jobFunctionName = row.getCell(3).value?.toString() || "";
        const supplierName = row.getCell(4).value?.toString() || "";
        
        const errors: string[] = [];
        if (!name) errors.push("Nome obrigatório");
        if (!cpf) errors.push("CPF obrigatório");
        if (cpf && cpf.length !== 11) errors.push("CPF inválido");
        if (!jobFunctionName) errors.push("Função obrigatória");
        if (!supplierName) errors.push("Fornecedor obrigatório");
        
        rows.push({
          name,
          cpf,
          jobFunctionName,
          supplierName,
          errors,
          valid: errors.length === 0,
        });
      });
      
      setPreviewData(rows);
      setShowPreview(true);
    } catch (error) {
      toast.error("Erro ao processar arquivo. Verifique o formato.");
      console.error(error);
    }
  };

  const handleConfirmImport = () => {
    if (!file) return;
    
    const validRows = previewData.filter(row => row.valid);
    if (validRows.length === 0) {
      toast.error("Nenhum registro válido para importar");
      return;
    }
    
    // Convert file to base64 for upload
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      uploadBatchFile.mutate({
        eventId,
        fileBuffer: base64.split(",")[1], // Remove data:... prefix
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const validCount = previewData.filter(row => row.valid).length;
  const invalidCount = previewData.length - validCount;
  const isProcessing = uploadBatchFile.isPending || processBatchImport.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importação em Lote de Colaboradores</DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel ou CSV para importar múltiplos colaboradores de uma vez
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Baixe o template, preencha com os dados dos colaboradores e faça o upload abaixo.
              </AlertDescription>
            </Alert>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
              />
              
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Arraste e solte o arquivo aqui
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou clique no botão abaixo para selecionar
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Selecionar Arquivo
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Formatos aceitos: Excel (.xlsx) ou CSV (.csv) • Tamanho máximo: 5MB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <strong>{validCount}</strong> registros válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <strong>{invalidCount}</strong> registros com erros
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index} className={!row.valid ? "bg-destructive/10" : ""}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.cpf}</TableCell>
                      <TableCell>{row.jobFunctionName}</TableCell>
                      <TableCell>{row.supplierName}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <Badge variant="default">Válido</Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="destructive">Erro</Badge>
                            {row.errors.map((error, i) => (
                              <p key={i} className="text-xs text-destructive">
                                {error}
                              </p>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {showPreview && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreview(false);
                  setFile(null);
                  setPreviewData([]);
                }}
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={validCount === 0 || isProcessing}
              >
                {isProcessing
                  ? "Importando..."
                  : `Importar ${validCount} Registro${validCount !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
