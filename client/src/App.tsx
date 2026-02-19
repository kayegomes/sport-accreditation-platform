import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Events from "./pages/Events";
import Collaborators from "./pages/Collaborators";
import Accreditations from "./pages/Accreditations";
import Suppliers from "./pages/Suppliers";
import JobFunctions from "./pages/JobFunctions";
import AuditLogs from "./pages/AuditLogs";
import PublicConsultation from "./pages/PublicConsultation";
import Reports from "./pages/Reports";
import EventAccess from "./pages/EventAccess";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/consulta" component={PublicConsultation} />
      
      {/* Protected routes with dashboard layout */}
      <Route path="/">
        <DashboardLayout>
          <Home />
        </DashboardLayout>
      </Route>
      
      <Route path="/eventos">
        <DashboardLayout>
          <Events />
        </DashboardLayout>
      </Route>
      
      <Route path="/colaboradores">
        <DashboardLayout>
          <Collaborators />
        </DashboardLayout>
      </Route>
      
      <Route path="/credenciamentos">
        <DashboardLayout>
          <Accreditations />
        </DashboardLayout>
      </Route>
      
      <Route path="/fornecedores">
        <DashboardLayout>
          <Suppliers />
        </DashboardLayout>
      </Route>
      
      <Route path="/funcoes">
        <DashboardLayout>
          <JobFunctions />
        </DashboardLayout>
      </Route>
      
      <Route path="/logs">
        <DashboardLayout>
          <AuditLogs />
        </DashboardLayout>
      </Route>
      
      <Route path="/relatorios">
        <DashboardLayout>
          <Reports />
        </DashboardLayout>
      </Route>
      
      <Route path="/acesso-eventos">
        <DashboardLayout>
          <EventAccess />
        </DashboardLayout>
      </Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
