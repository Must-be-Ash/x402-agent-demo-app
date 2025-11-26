import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CDPProvider from "@/components/providers/CDPProvider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Chat from "@/pages/Chat";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/chat" component={Chat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CDPProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </CDPProvider>
    </QueryClientProvider>
  );
}

export default App;
