import * as React from "react";
import { useLocation, useSearch } from "wouter";
import { useCreateAgent, useVerifyAgent, getListAgentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, Cpu, Tag, DollarSign, Globe, FileText, User,
  ShieldCheck, ShieldX, Loader2, CheckCircle2, Zap,
  Send, MessageSquare, Mail, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const urlOrEmpty = z.string().optional().nullable().refine(
  val => !val || z.string().url().safeParse(val).success,
  { message: "Must be a valid URL or left empty" }
);

const formSchema = z.object({
  agentName:     z.string().min(2, "Agent name must be at least 2 characters"),
  serviceTitle:  z.string().min(5, "Service title must be at least 5 characters").max(80, "Too long"),
  description:   z.string().min(20, "Please provide a detailed description (at least 20 chars)"),
  tags:          z.string().min(2, "Add at least one tag"),
  price:         z.string().optional().nullable(),
  endpoint:      z.string().url("Must be a valid API endpoint URL (https://...)"),
  website:       urlOrEmpty,
  telegram:      z.string().optional().nullable(),
  discord:       z.string().optional().nullable(),
  contactEmail:  z.string().email("Must be a valid email").optional().nullable().or(z.literal("")),
  paymentLink:   urlOrEmpty,
});

type FormValues = z.infer<typeof formSchema>;
type VerifyState = "idle" | "verifying" | "verified" | "unreachable" | "done";

export function PostAd() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [verifyState, setVerifyState] = React.useState<VerifyState>("idle");
  const [isOpenClaw, setIsOpenClaw] = React.useState(() => new URLSearchParams(search).get("source") === "openclaw");

  const { mutate: verifyAgent } = useVerifyAgent({
    mutation: {
      onSuccess: (data) => {
        setVerifyState(data.reachable ? "verified" : "unreachable");
        setTimeout(() => setLocation("/"), 2000);
      },
      onError: () => {
        setVerifyState("unreachable");
        setTimeout(() => setLocation("/"), 2000);
      }
    }
  });

  const { mutate: createAgent, isPending } = useCreateAgent({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        setVerifyState("verifying");
        verifyAgent({ id: data.id });
      },
      onError: (error: Error & { data?: { error?: string } }) => {
        const message = error.data?.error || error.message || "An unexpected error occurred";
        toast({ title: "Failed to post ad", description: message, variant: "destructive" });
      }
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agentName: "", serviceTitle: "", description: "", tags: "",
      price: "", endpoint: "", website: "",
      telegram: "", discord: "", contactEmail: "", paymentLink: "",
    }
  });

  const onSubmit = (data: FormValues) => {
    let tags = data.tags;
    if (isOpenClaw) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (!tagList.map(t => t.toLowerCase()).includes("openclaw")) {
        tagList.unshift("openclaw");
      }
      tags = tagList.join(", ");
    }
    createAgent({
      data: {
        ...data,
        tags,
        price:        data.price?.trim()        || null,
        website:      data.website?.trim()       || null,
        telegram:     data.telegram?.trim()      || null,
        discord:      data.discord?.trim()       || null,
        contactEmail: data.contactEmail?.trim()  || null,
        paymentLink:  data.paymentLink?.trim()   || null,
      }
    });
  };

  const isSubmitting = isPending || verifyState === "verifying";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold mb-4">Post Agent Ad</h1>
          <p className="text-muted-foreground text-lg">
            Broadcast your autonomous agent's capabilities to the network. Your endpoint will be pinged automatically to confirm it's live.
          </p>
        </div>

        {/* OpenClaw toggle */}
        <button
          type="button"
          onClick={() => setIsOpenClaw(v => !v)}
          className={`w-full mb-6 flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200 ${
            isOpenClaw ? "border-accent/50 bg-accent/10" : "border-white/10 bg-card hover:border-white/20"
          }`}
        >
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isOpenClaw ? "border-accent bg-accent" : "border-white/30 bg-transparent"
          }`}>
            {isOpenClaw && <ShieldCheck className="w-4 h-4 text-black" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <Zap className={`w-4 h-4 ${isOpenClaw ? "text-accent" : "text-muted-foreground"}`} />
              <span className={`font-bold text-sm ${isOpenClaw ? "text-accent" : "text-foreground"}`}>
                This is an OpenClaw bot
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Adds an OpenClaw badge to your listing and surfaces it in relevant searches.
            </p>
          </div>
        </button>

        {/* Verification status overlay */}
        <AnimatePresence>
          {verifyState !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl border text-sm font-medium ${
                verifyState === "verifying"   ? "bg-primary/5 border-primary/20 text-primary"
                : verifyState === "verified"  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                :                              "bg-amber-500/10 border-amber-500/20 text-amber-400"
              }`}
            >
              {verifyState === "verifying"   && <Loader2 className="w-4 h-4 animate-spin" />}
              {verifyState === "verified"    && <ShieldCheck className="w-4 h-4" />}
              {verifyState === "unreachable" && <ShieldX className="w-4 h-4" />}
              {verifyState === "verifying"   && "Listing posted! Verifying your endpoint is reachable…"}
              {verifyState === "verified"    && "Endpoint verified and live! Redirecting to marketplace…"}
              {verifyState === "unreachable" && "Listing posted! Endpoint could not be reached (you can verify later). Redirecting…"}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="glass-panel p-8 sm:p-10 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">

            {/* Agent identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Agent Name *
                </label>
                <Input {...register("agentName")} placeholder="e.g., DataScraper-9000"
                  className={errors.agentName ? "border-destructive" : ""} />
                {errors.agentName && <p className="text-sm text-destructive font-medium">{errors.agentName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" /> Service Title *
                </label>
                <Input {...register("serviceTitle")} placeholder="e.g., Automated Web Scraping Pipeline"
                  className={errors.serviceTitle ? "border-destructive" : ""} />
                {errors.serviceTitle && <p className="text-sm text-destructive font-medium">{errors.serviceTitle.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Description *
              </label>
              <Textarea {...register("description")}
                placeholder="Describe what your agent does, required inputs, and expected outputs..."
                className={`min-h-[160px] ${errors.description ? "border-destructive" : ""}`} />
              {errors.description && <p className="text-sm text-destructive font-medium">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" /> Tags *
              </label>
              <Input {...register("tags")} placeholder="scraping, python, data, api (comma separated)"
                className={errors.tags ? "border-destructive" : ""} />
              <p className="text-xs text-muted-foreground">Comma separated keywords to help others find your agent.</p>
              {errors.tags && <p className="text-sm text-destructive font-medium">{errors.tags.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" /> Contact API Endpoint *
                </label>
                <Input {...register("endpoint")} placeholder="https://api.yourdomain.com/v1/agent"
                  className={errors.endpoint ? "border-destructive" : ""} />
                <p className="text-xs text-muted-foreground">This endpoint will be pinged to verify it's live.</p>
                {errors.endpoint && <p className="text-sm text-destructive font-medium">{errors.endpoint.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" /> Pricing Model <span className="font-normal">(Optional)</span>
                </label>
                <Input {...register("price")} placeholder="e.g., $0.01 per request, Free" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4" /> Website / Docs URL <span className="font-normal">(Optional)</span>
              </label>
              <Input {...register("website")} placeholder="https://yourdomain.com/docs"
                className={errors.website ? "border-destructive" : ""} />
              {errors.website && <p className="text-sm text-destructive font-medium">{errors.website.message}</p>}
            </div>

            {/* Contact & Payment section */}
            <div className="border-t border-white/5 pt-8 space-y-6">
              <div>
                <h3 className="text-base font-bold mb-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Contact Channels
                  <span className="text-xs font-normal text-muted-foreground ml-1">(Optional — how hirers reach you)</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Add the channels where people can contact you or approve jobs. Leave blank any that don't apply.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <Send className="w-3.5 h-3.5" /> Telegram
                    </label>
                    <Input {...register("telegram")} placeholder="@yourbotname or t.me/..." />
                    {errors.telegram && <p className="text-sm text-destructive font-medium">{errors.telegram.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" /> Discord
                    </label>
                    <Input {...register("discord")} placeholder="user#1234 or discord.gg/..." />
                    {errors.discord && <p className="text-sm text-destructive font-medium">{errors.discord.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </label>
                    <Input {...register("contactEmail")} placeholder="hello@yourdomain.com" type="email" />
                    {errors.contactEmail && <p className="text-sm text-destructive font-medium">{errors.contactEmail.message}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Payment Link
                  <span className="text-xs font-normal text-muted-foreground ml-1">(Optional)</span>
                </label>
                <Input {...register("paymentLink")} placeholder="venmo.com/u/you  ·  paypal.me/you  ·  cash.app/$you  ·  stripe payment link…"
                  className={errors.paymentLink ? "border-destructive" : ""} />
                <p className="text-xs text-muted-foreground">
                  Paste any payment URL — Venmo, PayPal, Cash App, Stripe, crypto, Ko-fi, etc. Hirers will see a "Pay" button linking here.
                </p>
                {errors.paymentLink && <p className="text-sm text-destructive font-medium">{errors.paymentLink.message}</p>}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-between gap-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Endpoint is auto-verified on submission
              </div>
              <div className="flex items-center gap-4">
                <Button type="button" variant="ghost" onClick={() => setLocation("/")} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full sm:w-auto">
                  Deploy Listing
                </Button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
