import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileProvider } from "@/contexts/FileContext";
import Home from "@/pages/home";
import PrescriptionReview from "@/pages/prescription-review";
import History from "@/pages/history";
import Results from "@/pages/results";
import Config from "@/pages/config";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/review" component={PrescriptionReview}/>
      <Route path="/history" component={History}/>
      <Route path="/results" component={Results}/>
      <Route path="/config" component={Config}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FileProvider>
          <Toaster />
          <Router />
        </FileProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
