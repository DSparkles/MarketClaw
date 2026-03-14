import * as React from "react";
import { useParams, Link } from "wouter";
import { useGetAgent, getGetAgentQueryKey, useVerifyAgent, useSendAgentRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  ArrowLeft, Cpu, Terminal, DollarSign, Globe, 
  Calendar, Check, Copy, ExternalLink, FileText,
  ShieldCheck, ShieldX, Loader2, Send, RefreshCw,
  Clock, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type RequestStatus = "idle" | "sending" | "success" | "error";
type ContactMode = "simple" | "json";

interface SimpleForm {
  name: string;
  email: string;
  task: string;
  context: string;
}

function simpleFormToPayload(form: SimpleForm): string {
  const obj: Record<string, string> = { task: form.task };
  if (form.name.trim()) obj.name = form.name.trim();
  if (form.email.trim()) obj.email = form.email.trim();
  if (form.context.trim()) obj.context = form.context.trim();
  return JSON.stringify(obj, null, 2);
}

export function AgentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [contactMode, setContactMode] = React.useState<ContactMode>("simple");
  const [simpleForm, setSimpleForm] = React.useState<SimpleForm>({ name: "", email: "", task: "", context: "" });
  const [payload, setPayload] = React.useState('{\n  "task": ""\n}');
  const [payloadError, setPayloadError] = React.useState<string | null>(null);
  const [requestStatus, setRequestStatus] = React.useState<RequestStatus>("idle");
  const [responseData, setResponseData] = React.useState<{
    statusCode: number;
    rawBody: string;
    durationMs: number;
  } | null>(null);
  const [responseExpanded, setResponseExpanded] = React.useState(true);

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

  const { mutate: sendRequest } = useSendAgentRequest({
    mutation: {
      onSuccess: (data) => {
        setRequestStatus("success");
        setResponseData({ statusCode: data.statusCode, rawBody: data.rawBody ?? "", durationMs: data.durationMs });
        setResponseExpanded(true);
      },
      onError: (err: Error & { data?: { error?: string }; status?: number }) => {
        setRequestStatus("error");
        const msg = err.data?.error || err.message || "Request failed";
        setResponseData({ statusCode: err.status || 502, rawBody: msg, durationMs: 0 });
        setResponseExpanded(true);
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

  const handleSendRequest = () => {
    setPayloadError(null);
    let parsed: Record<string, unknown>;

    if (contactMode === "simple") {
      if (!simpleForm.task.trim()) {
        setPayloadError("Please describe what you need the agent to do.");
        return;
      }
      parsed = JSON.parse(simpleFormToPayload(simpleForm)) as Record<string, unknown>;
    } else {
      try {
        parsed = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        setPayloadError("Invalid JSON — please fix your payload before sending.");
        return;
      }
    }

    setRequestStatus("sending");
    setResponseData(null);
    sendRequest({ id, data: { payload: parsed } });
  };

  const switchToJson = () => {
    setPayload(simpleFormToPayload(simpleForm));
    setContactMode("json");
    setPayloadError(null);
  };

  const switchToSimple = () => {
    setContactMode("simple");
    setPayloadError(null);
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
          <Link href="/">
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tags = agent.tags ? agent.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const hostname = (() => { try { return new URL(agent.endpoint).hostname; } catch { return agent.endpoint; } })();

  const statusColor = (code: number) => {
    if (code < 300) return "text-emerald-400";
    if (code < 400) return "text-blue-400";
    if (code < 500) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

        {/* Back link */}
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
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-muted-foreground font-medium mb-4">{agent.agentName}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>

              <p className="text-foreground/80 leading-relaxed">{agent.description}</p>
            </div>

            {agent.price && (
              <div className="flex-shrink-0 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Pricing</p>
                <div className="flex items-center gap-1 font-bold text-primary text-lg">
                  <DollarSign className="w-4 h-4" />
                  {agent.price}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Endpoint */}
          <div className="glass-panel rounded-2xl p-5 md:col-span-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" /> API Endpoint
            </p>
            <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 py-3 border border-white/5">
              <code className="text-sm text-accent font-mono flex-1 truncate">{agent.endpoint}</code>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Copy endpoint"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground font-mono">{hostname}</p>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {verifying ? "Verifying…" : isVerified ? "Re-verify" : "Verify endpoint"}
              </button>
            </div>
          </div>

          {/* Meta */}
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
                <a
                  href={agent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {(() => { try { return new URL(agent.website).hostname; } catch { return agent.website; } })()}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Contact / Hire Panel */}
        <div className="glass-panel rounded-3xl overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Contact / Hire Agent
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Describe what you need and send it directly to this agent.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isVerified && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1.5">
                    <ShieldX className="w-3.5 h-3.5" />
                    Not verified
                  </span>
                )}
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 mt-5 bg-black/30 rounded-xl p-1 w-fit">
              <button
                onClick={switchToSimple}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  contactMode === "simple"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Simple Form
              </button>
              <button
                onClick={switchToJson}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  contactMode === "json"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                JSON Editor
              </button>
            </div>
          </div>

          <div className="p-8 space-y-6">

            {contactMode === "simple" ? (
              <div className="space-y-5">
                {/* Name + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Your name <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={simpleForm.name}
                      onChange={e => setSimpleForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Alex Johnson"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Your email <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input
                      type="email"
                      value={simpleForm.email}
                      onChange={e => setSimpleForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. alex@example.com"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                {/* Task */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground/80">
                    What do you need? <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={simpleForm.task}
                    onChange={e => {
                      setSimpleForm(f => ({ ...f, task: e.target.value }));
                      setPayloadError(null);
                    }}
                    rows={4}
                    placeholder={`Describe your task for ${agent?.agentName ?? "this agent"}…`}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-y transition-colors placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Context */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground/80">Additional context <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <textarea
                    value={simpleForm.context}
                    onChange={e => setSimpleForm(f => ({ ...f, context: e.target.value }))}
                    rows={3}
                    placeholder="Any background info, constraints, or preferences…"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-y transition-colors placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Request Payload (JSON)
                  </label>
                  <button
                    onClick={() => setPayload('{\n  "task": ""\n}')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  value={payload}
                  onChange={e => {
                    setPayload(e.target.value);
                    setPayloadError(null);
                  }}
                  rows={8}
                  spellCheck={false}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-sm text-accent focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-y transition-colors"
                />
              </div>
            )}

            {payloadError && (
              <p className="text-sm text-destructive font-medium">{payloadError}</p>
            )}

            <div className="flex items-center gap-4">
              <Button
                onClick={handleSendRequest}
                isLoading={requestStatus === "sending"}
                disabled={requestStatus === "sending"}
                size="lg"
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Send Request
              </Button>
              {responseData && (
                <span className={`text-sm font-mono font-bold ${statusColor(responseData.statusCode)}`}>
                  HTTP {responseData.statusCode}
                </span>
              )}
              {responseData && responseData.durationMs > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {responseData.durationMs}ms
                </span>
              )}
            </div>

            {/* Response panel */}
            {responseData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-2xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setResponseExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-black/30 text-sm font-bold hover:bg-black/40 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    Response
                    <span className={`font-mono text-xs px-2 py-0.5 rounded ${statusColor(responseData.statusCode)} bg-white/5`}>
                      {responseData.statusCode}
                    </span>
                  </span>
                  {responseExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {responseExpanded && (
                  <pre className="p-5 text-sm font-mono text-white/80 overflow-x-auto max-h-80 overflow-y-auto bg-black/20">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(responseData.rawBody), null, 2);
                      } catch {
                        return responseData.rawBody || "(empty response)";
                      }
                    })()}
                  </pre>
                )}
              </motion.div>
            )}

            <p className="text-xs text-muted-foreground">
              Requests are proxied through MarketClaw's server. The agent receives your message as JSON with a{" "}
              <code className="text-accent">X-MarketClaw-Request: true</code> header.
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
