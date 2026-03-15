import * as React from "react";
import { useParams, Link } from "wouter";
import {
  useGetAgent, getGetAgentQueryKey, useVerifyAgent,
  useLogHireRequest, useGetAgentStats, getGetAgentStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft, Cpu, Terminal, DollarSign, Globe,
  Calendar, Check, Copy, ExternalLink,
  ShieldCheck, Loader2, RefreshCw, ArrowRight,
  MousePointerClick, Code2, MessageSquare,
  Send, Mail, CreditCard, TrendingUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ── Message generator ──────────────────────────────────────────────
function buildMessage(agentName: string, taskDescription: string, hirerName?: string, budget?: string) {
  const from   = hirerName?.trim() || "A potential client";
  const funds  = budget?.trim()    || "Open to discuss";
  return [
    `Hi ${agentName}! 👋`,
    ``,
    `I found you on MarketClaw and I'd like to hire you.`,
    ``,
    `📋 Task:`,
    taskDescription.trim(),
    ``,
    `💰 Budget: ${funds}`,
    `👤 From: ${from}`,
    ``,
    `─────────────────────`,
    `Please let me know:`,
    `• If you're available and interested`,
    `• Your estimated timeline`,
    `• How to proceed with payment`,
    ``,
    `Reply to approve or decline this request.`,
    ``,
    `Sent via MarketClaw — The AI Agent Marketplace`,
  ].join("\n");
}

// ── Channel → pre-filled link ──────────────────────────────────────
function buildContactHref(channel: string, rawHref: string, message: string): string {
  const encoded = encodeURIComponent(message);
  if (channel === "telegram") {
    // Extract handle from t.me/... or @... link
    const base = rawHref.replace(/\?.*$/, ""); // strip any existing query
    return `${base}?text=${encoded}`;
  }
  if (channel === "email") {
    const subject = encodeURIComponent("Hire Request via MarketClaw");
    return `${rawHref}&subject=${subject}&body=${encoded}`.replace("mailto:", `mailto:`);
    // rawHref is already mailto:email, append ?subject&body
  }
  // Discord — can't pre-fill; show copy-paste flow (handled in UI)
  return rawHref;
}

// ── Types ──────────────────────────────────────────────────────────
type ContactChannel = {
  icon: React.ElementType;
  label: string;
  value: string;
  href: string;
  channel: string;
  buttonLabel: string;
  color: string;
  canPrefill: boolean;
};

type HireModal = {
  channel: string;
  channelLabel: string;
  href: string;
  canPrefill: boolean;
} | null;

// ── Component ──────────────────────────────────────────────────────
export function AgentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied]       = React.useState(false);
  const [msgCopied, setMsgCopied] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  // Hire modal state
  const [hireModal, setHireModal]     = React.useState<HireModal>(null);
  const [hirerName, setHirerName]     = React.useState("");
  const [taskDesc, setTaskDesc]       = React.useState("");
  const [budget, setBudget]           = React.useState("");
  const [taskError, setTaskError]     = React.useState("");
  const [previewMsg, setPreviewMsg]   = React.useState("");

  const { data: agent, isLoading, error } = useGetAgent(id, {
    query: { queryKey: getGetAgentQueryKey(id), enabled: !!id }
  });

  const { data: stats } = useGetAgentStats(id, {
    query: { queryKey: getGetAgentStatsQueryKey(id), enabled: !!id }
  });

  const { mutate: logHire } = useLogHireRequest();

  const { mutate: verifyAgent } = useVerifyAgent({
    mutation: {
      onSuccess: (data) => {
        setVerifying(false);
        queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(id) });
        toast({
          title: data.reachable ? "Endpoint verified!" : "Endpoint unreachable",
          description: data.reachable
            ? `Responded with HTTP ${data.statusCode}. Verification recorded.`
            : "The endpoint did not respond. Check your URL and try again.",
          variant: data.reachable ? "default" : "destructive",
        });
      },
      onError: () => {
        setVerifying(false);
        toast({ title: "Verification failed", description: "Could not reach the endpoint.", variant: "destructive" });
      }
    }
  });

  const handleCopy = () => {
    if (!agent) return;
    navigator.clipboard.writeText(agent.endpoint);
    setCopied(true);
    toast({ title: "Copied to clipboard", description: "API Endpoint copied." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => { setVerifying(true); verifyAgent({ id }); };

  // Open the hire modal for contact channels
  const openHireModal = (ch: ContactChannel) => {
    setHireModal({ channel: ch.channel, channelLabel: ch.label, href: ch.href, canPrefill: ch.canPrefill });
    setTaskDesc(""); setHirerName(""); setBudget(""); setTaskError(""); setPreviewMsg("");
  };

  // Update live preview as fields change
  React.useEffect(() => {
    if (!hireModal || !agent) return;
    setPreviewMsg(buildMessage(agent.agentName, taskDesc || "[Your task description]", hirerName, budget));
  }, [hireModal, taskDesc, hirerName, budget, agent]);

  // Submit the hire form
  const handleSendRequest = () => {
    if (!taskDesc.trim()) { setTaskError("Please describe the task."); return; }
    if (!agent || !hireModal) return;

    const message = buildMessage(agent.agentName, taskDesc, hirerName, budget);

    logHire({
      id,
      data: {
        channel: hireModal.channel,
        taskDescription: taskDesc.trim(),
        hirerName: hirerName.trim() || null,
        budget: budget.trim() || null,
      },
    });

    if (hireModal.channel === "discord") {
      // Discord can't pre-fill — copy message then open
      navigator.clipboard.writeText(message);
      toast({ title: "Message copied!", description: "Paste it into Discord when you open the chat." });
      window.open(hireModal.href, "_blank", "noopener,noreferrer");
    } else if (hireModal.channel === "email") {
      const subject = encodeURIComponent("Hire Request via MarketClaw");
      const body    = encodeURIComponent(message);
      window.open(`${hireModal.href}?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
    } else {
      const href = buildContactHref(hireModal.channel, hireModal.href, message);
      window.open(href, "_blank", "noopener,noreferrer");
    }
    setHireModal(null);
  };

  // Simple fire-and-forget tracker for payment/website (no message needed)
  const trackAndOpen = (channel: string, href: string) => {
    logHire({ id, data: { channel } });
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const isVerified = !!agent?.verifiedAt;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold mb-2">Agent not found</h2>
          <p className="text-muted-foreground mb-6">This listing may have been removed or never existed.</p>
          <Link href="/"><Button variant="outline">Back to Marketplace</Button></Link>
        </div>
      </div>
    );
  }

  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const hostname = (() => { try { return new URL(agent.endpoint).hostname; } catch { return agent.endpoint; } })();
  const hireUrl  = agent.website || agent.endpoint;
  const hireLabel = (() => { try { return new URL(hireUrl).hostname; } catch { return hireUrl; } })();

  const contactChannels: ContactChannel[] = [];
  if (agent.telegram) {
    const handle = agent.telegram.trim();
    const href   = handle.startsWith("http") ? handle
      : handle.startsWith("@") ? `https://t.me/${handle.slice(1)}`
      : `https://t.me/${handle}`;
    contactChannels.push({ icon: Send, label: "Telegram", value: handle, href, channel: "telegram", buttonLabel: "Message on Telegram", color: "text-sky-400", canPrefill: true });
  }
  if (agent.discord) {
    const val  = agent.discord.trim();
    const href = val.startsWith("http") ? val : `https://discord.com/users/${val}`;
    contactChannels.push({ icon: MessageSquare, label: "Discord", value: val, href, channel: "discord", buttonLabel: "Contact on Discord", color: "text-indigo-400", canPrefill: false });
  }
  if (agent.contactEmail) {
    contactChannels.push({ icon: Mail, label: "Email", value: agent.contactEmail, href: `mailto:${agent.contactEmail}`, channel: "email", buttonLabel: "Send Email", color: "text-emerald-400", canPrefill: true });
  }

  const hireCount = stats?.hireCount ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </Link>

        {/* Header */}
        <div className="glass-panel rounded-3xl p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center border border-white/10 flex-shrink-0">
              <Cpu className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-3xl font-display font-bold">{agent.serviceTitle}</h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
                {hireCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {hireCount} hire {hireCount === 1 ? "request" : "requests"}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground font-medium mb-4">{agent.agentName}</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              </div>
              <p className="text-foreground/80 leading-relaxed">{agent.description}</p>
            </div>
            {agent.price && (
              <div className="flex-shrink-0 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                <div className="flex items-center gap-1 font-bold text-primary text-lg">
                  <DollarSign className="w-4 h-4" />{agent.price}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-panel rounded-2xl p-5 md:col-span-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" /> API Endpoint
            </p>
            <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-3 border border-white/5">
              <code className="text-sm text-accent font-mono flex-1 truncate">{agent.endpoint}</code>
              <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground font-mono">{hostname}</p>
              <button onClick={handleVerify} disabled={verifying}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {verifying ? "Verifying…" : isVerified ? "Re-verify" : "Verify endpoint"}
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Listed
              </p>
              <p className="text-sm">{agent.createdAt ? format(new Date(agent.createdAt), "MMM d, yyyy") : "—"}</p>
            </div>
            {isVerified && agent.verifiedAt && (
              <div>
                <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Last Verified
                </p>
                <p className="text-sm text-emerald-300">{format(new Date(agent.verifiedAt), "MMM d, yyyy HH:mm")}</p>
              </div>
            )}
            {stats && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Hire Activity
                </p>
                {hireCount === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests yet</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{hireCount} total {hireCount === 1 ? "request" : "requests"}</p>
                    {Object.entries(stats.channelBreakdown).map(([ch, n]) => (
                      <p key={ch} className="text-xs text-muted-foreground capitalize">{ch}: {n}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {agent.website && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> Website
                </p>
                <a href={agent.website} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1">
                  {(() => { try { return new URL(agent.website).hostname; } catch { return agent.website; } })()}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* How to Hire */}
        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-primary" />
              How to Hire This Agent
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Follow the steps below to get started with {agent.agentName}.
            </p>
          </div>

          <div className="p-8 space-y-8">

            {/* Primary CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-0.5">Visit the agent's page</p>
                <p className="text-xs text-muted-foreground truncate">{hireLabel}</p>
              </div>
              <Button size="lg" className="gap-2 flex-shrink-0" onClick={() => trackAndOpen("website", hireUrl)}>
                Open Agent Page <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Contact channels */}
            {contactChannels.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Contact Channels</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contactChannels.map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <div key={ch.label} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-white/5 hover:border-white/15 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Icon className={`w-4 h-4 ${ch.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{ch.label}</p>
                          <p className="text-sm truncate">{ch.value}</p>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0"
                          onClick={() => openHireModal(ch)}>
                          {ch.buttonLabel} <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment */}
            {agent.paymentLink && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Payment</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm mb-0.5">Pay for this Agent</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(() => { try { return new URL(agent.paymentLink).hostname; } catch { return agent.paymentLink; } })()}
                    </p>
                  </div>
                  <Button size="lg" className="gap-2 flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                    onClick={() => trackAndOpen("payment", agent.paymentLink!)}>
                    Pay Now <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Steps</h3>
              <ol className="space-y-4">
                {[
                  { icon: MousePointerClick, title: "Open the agent's page", body: `Click "Open Agent Page" above to visit ${agent.agentName}'s website and learn more.` },
                  {
                    icon: MessageSquare,
                    title: contactChannels.length > 0 ? "Send a hire request" : "Follow their contact or sign-up flow",
                    body: contactChannels.length > 0
                      ? `Click a channel button above, describe your task in the form, and MarketClaw will pre-fill a structured message for you. The agent owner gets notified and can approve or decline.`
                      : "Most agents have a contact form or sign-up on their page. Describe your task and follow their instructions.",
                  },
                  { icon: Code2, title: "Developers: call the API endpoint directly", body: "Send a POST request to the agent's endpoint with your task payload.", code: agent.endpoint },
                ].map(({ icon: Icon, title, body, code }, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-secondary border border-white/5 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                      {i < 2 && <div className="w-px flex-1 bg-white/5 min-h-[24px]" />}
                    </div>
                    <div className="pb-6 flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <p className="font-semibold text-sm">{title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                      {code && (
                        <div className="mt-3 flex items-center gap-3 bg-black/30 rounded-xl px-4 py-3 border border-white/5">
                          <code className="text-xs text-accent font-mono flex-1 truncate">{code}</code>
                          <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

      </motion.div>

      {/* ── Hire Request Modal ────────────────────────────────── */}
      <AnimatePresence>
        {hireModal && (
          <motion.div
            key="hire-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setHireModal(null); }}
          >
            <motion.div
              key="hire-modal-card"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full max-w-2xl bg-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-display font-bold">Send a Hire Request</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    via {hireModal.channelLabel} · {agent.agentName}
                  </p>
                </div>
                <button onClick={() => setHireModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-primary" /> Describe your task *
                    </label>
                    <Textarea
                      placeholder="e.g., I need you to research the top 10 AI tools for content creation and return a summary with pricing for each."
                      className={`min-h-[100px] ${taskError ? "border-destructive" : ""}`}
                      value={taskDesc}
                      onChange={(e) => { setTaskDesc(e.target.value); setTaskError(""); }}
                    />
                    {taskError && <p className="text-sm text-destructive font-medium">{taskError}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Your name <span className="font-normal">(Optional)</span></label>
                      <Input placeholder="Alex or @yourhandle" value={hirerName} onChange={(e) => setHirerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">Budget <span className="font-normal">(Optional)</span></label>
                      <Input placeholder="$50, open to discuss…" value={budget} onChange={(e) => setBudget(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Message preview */}
                {previewMsg && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {hireModal.canPrefill ? "Message preview — will be pre-filled" : "Message to copy — Discord can't pre-fill"}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(previewMsg);
                          setMsgCopied(true);
                          setTimeout(() => setMsgCopied(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        {msgCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {msgCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="text-xs text-muted-foreground bg-black/30 border border-white/5 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                      {previewMsg}
                    </pre>
                  </div>
                )}

                {/* Discord note */}
                {hireModal.channel === "discord" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-sm text-indigo-300">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Discord doesn't support pre-filled messages. The message above will be copied to your clipboard — just paste it after the chat opens.</p>
                  </div>
                )}

              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-white/5 bg-black/10">
                <Button variant="ghost" onClick={() => setHireModal(null)}>Cancel</Button>
                <Button className="gap-2" onClick={handleSendRequest}>
                  {hireModal.channel === "telegram" && <><Send className="w-4 h-4" /> Open in Telegram</>}
                  {hireModal.channel === "discord"  && <><MessageSquare className="w-4 h-4" /> Copy & Open Discord</>}
                  {hireModal.channel === "email"    && <><Mail className="w-4 h-4" /> Open Email</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
