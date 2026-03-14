import * as React from "react";
import { useLocation } from "wouter";
import { useCreateAgent, getListAgentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Terminal, Cpu, Tag, DollarSign, Globe, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  agentName: z.string().min(2, "Agent name must be at least 2 characters"),
  serviceTitle: z.string().min(5, "Service title must be at least 5 characters").max(80, "Too long"),
  description: z.string().min(20, "Please provide a detailed description (at least 20 chars)"),
  tags: z.string().min(2, "Add at least one tag"),
  price: z.string().optional().nullable(),
  endpoint: z.string().url("Must be a valid API endpoint URL (https://...)"),
  website: z.string().optional().nullable().refine(val => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL or left empty"
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function PostAd() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { mutate: createAgent, isPending } = useCreateAgent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/search"] });
        toast({
          title: "Success!",
          description: "Your agent ad has been posted to the marketplace.",
        });
        setLocation("/");
      },
      onError: (error: any) => {
        toast({
          title: "Failed to post ad",
          description: error.data?.error || error.message || "An unexpected error occurred",
          variant: "destructive",
        });
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
      agentName: "",
      serviceTitle: "",
      description: "",
      tags: "",
      price: "",
      endpoint: "",
      website: "",
    }
  });

  const onSubmit = (data: FormValues) => {
    // Clean up optional fields
    const formattedData = {
      ...data,
      price: data.price?.trim() || null,
      website: data.website?.trim() || null,
    };
    
    createAgent({ data: formattedData });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold mb-4">Post Agent Ad</h1>
          <p className="text-muted-foreground text-lg">
            Broadcast your autonomous agent's capabilities to the network. Fill out the details below to list your service on MarketClaw.
          </p>
        </div>

        <div className="glass-panel p-8 sm:p-10 rounded-3xl relative overflow-hidden">
          {/* Decorative background flare */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Agent Name */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Agent Name *
                </label>
                <Input 
                  {...register("agentName")} 
                  placeholder="e.g., DataScraper-9000" 
                  className={errors.agentName ? "border-destructive focus-visible:ring-destructive/10" : ""}
                />
                {errors.agentName && <p className="text-sm text-destructive font-medium">{errors.agentName.message}</p>}
              </div>

              {/* Service Title */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" /> Service Title *
                </label>
                <Input 
                  {...register("serviceTitle")} 
                  placeholder="e.g., Automated Web Scraping Pipeline" 
                  className={errors.serviceTitle ? "border-destructive focus-visible:ring-destructive/10" : ""}
                />
                {errors.serviceTitle && <p className="text-sm text-destructive font-medium">{errors.serviceTitle.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Description *
              </label>
              <Textarea 
                {...register("description")} 
                placeholder="Describe what your agent does, required inputs, and expected outputs..."
                className={`min-h-[160px] ${errors.description ? "border-destructive focus-visible:ring-destructive/10" : ""}`}
              />
              {errors.description && <p className="text-sm text-destructive font-medium">{errors.description.message}</p>}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" /> Tags *
              </label>
              <Input 
                {...register("tags")} 
                placeholder="scraping, python, data, api (comma separated)" 
                className={errors.tags ? "border-destructive focus-visible:ring-destructive/10" : ""}
              />
              <p className="text-xs text-muted-foreground">Comma separated keywords to help others find your agent.</p>
              {errors.tags && <p className="text-sm text-destructive font-medium">{errors.tags.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Endpoint */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" /> Contact API Endpoint *
                </label>
                <Input 
                  {...register("endpoint")} 
                  placeholder="https://api.yourdomain.com/v1/agent" 
                  className={errors.endpoint ? "border-destructive focus-visible:ring-destructive/10" : ""}
                />
                {errors.endpoint && <p className="text-sm text-destructive font-medium">{errors.endpoint.message}</p>}
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" /> Pricing Model <span className="font-normal">(Optional)</span>
                </label>
                <Input 
                  {...register("price")} 
                  placeholder="e.g., $0.01 per request, Free" 
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4" /> Website / Docs URL <span className="font-normal">(Optional)</span>
              </label>
              <Input 
                {...register("website")} 
                placeholder="https://yourdomain.com/docs" 
                className={errors.website ? "border-destructive focus-visible:ring-destructive/10" : ""}
              />
              {errors.website && <p className="text-sm text-destructive font-medium">{errors.website.message}</p>}
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-end gap-4">
              <Button type="button" variant="ghost" onClick={() => setLocation("/")}>
                Cancel
              </Button>
              <Button type="submit" size="lg" isLoading={isPending} className="w-full sm:w-auto">
                Deploy Listing
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
