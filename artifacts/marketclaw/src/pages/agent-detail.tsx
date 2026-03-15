import * as React from "react";
import { useParams, Link } from "wouter";
import { useGetAgent, getGetAgentQueryKey, useVerifyAgent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft, Cpu, Terminal, DollarSign, Globe,
  Calendar, Check, Copy, ExternalLink,
  ShieldCheck, Loader2, RefreshCw, ArrowRight,
  MousePointerClick, Code2, MessageSquare,
  Send, Mail, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function AgentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  const { data: agent, isLoading, error } = useGetAgent(id, {
    query: { queryKey: getGetAgentQueryKey(id), enabled: !!id }
  });

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

  const handleVerify = () => {
    setVerifying(true);
    verifyAgent({ id });
  };

  const isVerified = !!agent?.verifiedAt;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading agent listing…</p>
        </div>
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
  const hireUrl = agent.website || agent.endpoint;
  const hireLabel = (() => { try { return new URL(hireUrl).hostname; } catch { return hireUrl; } })();

  // Build contact channels list
  const contactChannels: { icon: React.ElementType; label: string; value: string; href: string; buttonLabel: string; color: string }[] = [];
  if (agent.telegram) {
    const handle = agent.telegram.trim();
    const href = handle.startsWith("http") ? handle
      : handle.startsWith("@") ? `https://t.me/${handle.slice(1)}`
      : `https://t.me/${handle}`;
    contactChannels.push({ icon: Send, label: "Telegram", value: handle, href, buttonLabel: "Message on Telegram", color: "text-sky-400" });
  }
  if (agent.discord) {
    const val = agent.discord.trim();
    const href = val.startsWith("http") ? val : `https://discord.com/users/${val}`;
    contactChannels.push({ icon: MessageSquare, label: "Discord", value: val, href, buttonLabel: "Contact on Discord", color: "text-indigo-400" });
  }
  if (agent.contactEmail) {
    contactChannels.push({ icon: Mail, label: "Email", value: agent.contactEmail, href: `mailto:${agent.contactEmail}`, buttonLabel: "Send Email", color: "text-emerald-400" });
  }

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
              <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" title="Copy endpoint">
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
              <p className="text-sm">{format(new Date(agent.createdAt), "MMM d, yyyy")}</p>
            </div>
            {isVerified && agent.verifiedAt && (
              <div>
                <p className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Last Verified
                </p>
                <p className="text-sm text-emerald-300">{format(new Date(agent.verifiedAt), "MMM d, yyyy HH:mm")}</p>
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
              <a href={hireUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                <Button size="lg" className="gap-2">
                  Open Agent Page <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>

            {/* Contact channels */}
            {contactChannels.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Contact Channels</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contactChannels.map(({ icon: Icon, label, value, href, buttonLabel, color }) => (
                    <div key={label} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-white/5 hover:border-white/15 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="text-sm truncate">{value}</p>
                      </div>
                      <a href={href} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          {buttonLabel} <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  ))}
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
                  <a href={agent.paymentLink} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                      Pay Now <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Steps</h3>
              <ol className="space-y-4">
                {[
                  {
                    icon: MousePointerClick,
                    title: "Open the agent's page",
                    body: `Click "Open Agent Page" above to go to ${agent.agentName}'s website where you can learn more and get started.`,
                  },
                  {
                    icon: MessageSquare,
                    title: contactChannels.length > 0
                      ? "Reach out via their listed contact channels"
                      : "Follow their contact or sign-up flow",
                    body: contactChannels.length > 0
                      ? `Message them directly on ${contactChannels.map(c => c.label).join(" or ")} using the buttons above. They'll receive a notification and get back to you to discuss or approve your job.`
                      : "Most agents have a contact form, chat interface, or account sign-up on their page. Follow their instructions to describe your task.",
                  },
                  {
                    icon: Code2,
                    title: "Developers: call the API endpoint directly",
                    body: "If you want to integrate this agent into your own system, send a POST request to their API endpoint with your task payload. Copy the endpoint above to get started.",
                    code: agent.endpoint,
                  },
                ].map(({ icon: Icon, title, body, code }, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-secondary border border-white/5 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
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
    </div>
  );
}
