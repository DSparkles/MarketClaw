import * as React from "react";
import { useParams, Link } from "wouter";
import { useGetAgent, getGetAgentQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  ArrowLeft, Cpu, Terminal, DollarSign, Globe, 
  Calendar, Check, Copy, ExternalLink, FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function AgentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const { data: agent, isLoading, error } = useGetAgent(id, {
    query: { queryKey: getGetAgentQueryKey(id), enabled: !!id }
  });

  const handleCopy = () => {
    if (!agent) return;
    navigator.clipboard.writeText(agent.endpoint);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "API Endpoint copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 w-32 bg-secondary rounded-lg mb-8" />
        <div className="h-12 w-3/4 bg-secondary rounded-2xl mb-4" />
        <div className="h-6 w-1/4 bg-secondary rounded-lg mb-12" />
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="h-4 w-full bg-secondary rounded" />
            <div className="h-4 w-full bg-secondary rounded" />
            <div className="h-4 w-2/3 bg-secondary rounded" />
          </div>
          <div className="h-64 bg-secondary rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-32 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Agent Not Found</h2>
        <p className="text-muted-foreground mb-8">The agent you are looking for does not exist or has been removed.</p>
        <Link href="/">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    );
  }

  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 group font-medium">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Marketplace
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <Cpu className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">{agent.serviceTitle}</h1>
              <div className="flex items-center gap-3 text-lg text-muted-foreground">
                <span className="font-semibold text-white/90">{agent.agentName}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                <span className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4 h-4" />
                  Listed {format(new Date(agent.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm bg-secondary/50">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-panel rounded-3xl p-8">
              <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                About this Agent
              </h3>
              <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {agent.description}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connection Info */}
            <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px]" />
              
              <h3 className="text-lg font-display font-bold mb-6 text-white border-b border-border pb-4">Connection</h3>
              
              <div className="space-y-6 relative z-10">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">API Endpoint</label>
                  <div className="flex items-center gap-2 bg-background/50 rounded-xl p-3 border border-border">
                    <Terminal className="w-4 h-4 text-primary shrink-0" />
                    <code className="text-sm font-mono text-white/90 truncate flex-1" title={agent.endpoint}>
                      {agent.endpoint}
                    </code>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-white/10" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Pricing Model</label>
                  <div className="flex items-center gap-2 text-white/90 font-medium">
                    <DollarSign className="w-5 h-5 text-accent" />
                    {agent.price || "Free / Unspecified"}
                  </div>
                </div>

                {agent.website && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Documentation</label>
                    <a 
                      href={agent.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      <Globe className="w-5 h-5" />
                      Visit Website
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-3xl p-6 text-center shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <h4 className="font-bold text-lg mb-2">Ready to integrate?</h4>
              <p className="text-sm text-white/70 mb-4">Use the endpoint above to connect your systems directly to this agent.</p>
              <Button className="w-full gap-2 rounded-xl" onClick={handleCopy}>
                <Copy className="w-4 h-4" /> Copy API URL
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
