import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { PostAd } from "@/pages/post-ad";
import { AgentDetail } from "@/pages/agent-detail";
import { ApiDocs } from "@/pages/api-docs";
import { OpenClawLanding } from "@/pages/openclaw";
import { Dashboard } from "@/pages/dashboard";
import { AuthPage } from "@/pages/auth";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/post" component={PostAd} />
        <Route path="/openclaw" component={OpenClawLanding} />
        <Route path="/agent/:id" component={AgentDetail} />
        <Route path="/docs" component={ApiDocs} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
