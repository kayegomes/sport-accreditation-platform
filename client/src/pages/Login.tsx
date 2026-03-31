import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl as getGoogleLoginUrl } from "@/const";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success(`Bem-vindo de volta, ${data.user.name}!`);
      // Redirect to home
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao realizar login");
      setIsLoading(false);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setIsLoading(true);
    loginMutation.mutate({ email, password });
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4 transform -rotate-6">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Esporte Acesso</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-xs">Premium Accreditation Platform</p>
        </div>

        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1.5 w-full bg-blue-600" />
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-slate-800 text-center">Entrar no Sistema</CardTitle>
            <CardDescription className="text-center text-slate-500">
              Utilize sua conta corporativa ou e-mail e senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="email@empresa.com" 
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <a href="#" className="text-xs text-blue-600 hover:underline font-medium">Esqueceu a senha?</a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 font-bold transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Autenticando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Entrar com E-mail
                  </div>
                )}
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium tracking-wider">ou continue com</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-11 border-slate-200 hover:bg-slate-50 font-semibold"
              onClick={handleGoogleLogin}
              type="button"
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Google Workspace
            </Button>
          </CardContent>
          <CardFooter className="pb-8 pt-2">
            <p className="w-full text-center text-sm text-slate-500">
              Não tem acesso? <a href="#" className="text-blue-600 hover:underline font-bold">Solicite ao seu gestor</a>
            </p>
          </CardFooter>
        </Card>
        
        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">© 2026 Esporte Credenciamento Platform. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}
