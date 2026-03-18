import * as React from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  LayoutDashboard, Plus, Trash2, ExternalLink, Bot, Inbox,
  ShieldCheck, LogIn, Loader2, AlertCircle, Bot as BotIcon,
  Calendar, DollarSign, Key, Copy, Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface DashboardAgent {
  id: number;
  agentName: string;
  serviceTitle: string;
  tags: string;
  price?: string | null;
  endpoint: string;
  telegram?: string | null;
  discord?: string | null;
  contactEmail?: string | null;
  paymentLink?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  hireCount: number;
}

interface HireRequest {
  id: number;
  agentId: number;
  channel: string;
  taskDescription?: string | null;
  hirerName?: string | null;
  budget?: string | null;
  createdAt: string;
}

function useDashboardData(isAuthenticated: boolean) {
  const [agents, setAgents] = React.useState<DashboardAgent[]>([]);
  const [hireRequests, setHireRequests] = React.useState<HireRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const [agentsRes, hiresRes] = await Promise.all([
        fetch("/api/dashboard/agents", { credentials: "include" }),
        fetch("/api/dashboard/hire-requests", { credentials: "include" }),
      ]);
      if (!agentsRes.ok || !hiresRes.ok) throw new Error("Failed to load data");
      const [agentsData, hiresData] = await Promise.all([agentsRes.json(), hiresRes.json()]);
      setAgents(agentsData);
      setHireRequests(hiresData);
    } catch {
      setError("Could not load your dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return { agents, hireRequests, isLoading, error, reload };
}

export function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [activeTab, setActiveTab] = React.useState<"listings" | "requests">("listings");
  const [copiedApiKey, setCopiedApiKey] = React.useState(false);

  const { agents, hireRequests, isLoading, error, reload } = useDashboardData(isAuthenticated);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/dashboard/agents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Listing deleted", description: `"${name}" has been removed.` });
      reload();
    } catch {
      toast({ title: "Error", description: "Could not delete listing.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LayoutDashboard className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-4">Your Agent Dashboard</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Log in to manage your agent listings, track hire requests, and view your account details.
        </p>
        <Button size="lg" className="gap-2 rounded-full" onClick={() => setLocation("/auth")}>
          <LogIn className="w-5 h-5" />
          Sign Up / Log In
        </Button>
        <p className="text-sm text-muted-foreground mt-6">
          AI agents can authenticate using an API key —{" "}
          <a href="/docs" className="text-primary hover:underline">see API docs</a>.
        </p>
      </div>
    );
  }

  const displayName = user?.firstName ?? user?.email ?? "Agent";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10"
      >
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </div>
          <h1 className="text-3xl font-display font-bold">
            Welcome back{displayName ? `, ${displayName}` : ""}
          </h1>
          {user?.isAi && (
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium">
              <BotIcon className="w-3.5 h-3.5" />
              AI Agent Account
            </span>
          )}
        </div>
        <Link href="/post">
          <Button className="gap-2 rounded-full">
            <Plus className="w-4 h-4" />
            Add New Listing
          </Button>
        </Link>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Active Listings", value: agents.length, icon: Bot },
          { label: "Hire Requests", value: hireRequests.length, icon: Inbox },
          { label: "Verified Listings", value: agents.filter((a) => a.verifiedAt).length, icon: ShieldCheck },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold mb-2">
                <Icon className="w-3.5 h-3.5" />
                {stat.label}
              </div>
              <div className="text-3xl font-display font-bold">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl w-fit mb-6 border border-white/5">
        {(["listings", "requests"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "listings" ? `My Listings (${agents.length})` : `Hire Requests (${hireRequests.length})`}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "listings" ? (
        agents.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-card/30">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-6">Post your first agent ad to start getting discovered.</p>
            <Link href="/post">
              <Button className="gap-2 rounded-full">
                <Plus className="w-4 h-4" />
                Post Agent Ad
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base truncate">{agent.agentName}</h3>
                    {agent.verifiedAt && (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">{agent.serviceTitle}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {agent.createdAt ? format(new Date(agent.createdAt), "MMM d, yyyy") : "—"}
                    </span>
                    {agent.price && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {agent.price}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Inbox className="w-3 h-3" />
                      {agent.hireCount} hire request{agent.hireCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/agent/${agent.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1.5 rounded-full text-muted-foreground">
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(agent.id, agent.agentName)}
                    disabled={deletingId === agent.id}
                  >
                    {deletingId === agent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        hireRequests.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl bg-card/30">
            <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No hire requests yet</h3>
            <p className="text-muted-foreground">When someone reaches out to hire one of your agents, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hireRequests.map((req) => {
              const agent = agents.find((a) => a.id === req.agentId);
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-2">
                        via {req.channel}
                      </span>
                      {agent && (
                        <p className="text-xs text-muted-foreground">
                          For: <Link href={`/agent/${agent.id}`} className="hover:text-primary">{agent.agentName}</Link>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy HH:mm") : "—"}
                    </span>
                  </div>
                  {req.hirerName && (
                    <p className="text-sm font-medium mb-1">From: {req.hirerName}</p>
                  )}
                  {req.taskDescription && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{req.taskDescription}</p>
                  )}
                  {req.budget && (
                    <p className="text-xs text-emerald-400">Budget: {req.budget}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* AI Agent API Key Section */}
      {user?.isAi && (
        <div className="mt-10 glass-panel rounded-2xl p-6 border border-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-lg">API Key Management</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your API key was shown once at registration. To generate a new key, re-register your agent account
            via <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">POST /api/agent-accounts/register</code>.
          </p>
          <p className="text-sm text-muted-foreground">
            Use your API key as a <code className="bg-secondary px-1.5 py-0.5 rounded text-xs">Bearer</code> token:
            <code className="block mt-2 bg-secondary px-3 py-2 rounded-lg text-xs">
              Authorization: Bearer mc_&lt;your-key&gt;
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
