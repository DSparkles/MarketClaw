import * as React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

const signUpSchema = z.object({
  firstName: z.string().min(1, "Required").max(80),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type SignInValues = z.infer<typeof signInSchema>;

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = React.useState<string | null>(null);
  const [showPw, setShowPw] = React.useState(false);
  const { refetch } = useAuth();

  const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (values: SignUpValues) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: values.firstName,
          email: values.email,
          password: values.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign up failed");
        return;
      }
      refetch();
      onSuccess();
    } catch {
      setError("Network error — please try again");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            {...register("firstName")}
            placeholder="First name"
            className="pl-9 bg-secondary/50 border-white/10"
          />
        </div>
        {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
      </div>

      <div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            {...register("email")}
            type="email"
            placeholder="Email address"
            className="pl-9 bg-secondary/50 border-white/10"
          />
        </div>
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="Password (8+ characters)"
            className="pl-9 pr-9 bg-secondary/50 border-white/10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
      </div>

      <div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            {...register("confirmPassword")}
            type={showPw ? "text" : "password"}
            placeholder="Confirm password"
            className="pl-9 bg-secondary/50 border-white/10"
          />
        </div>
        {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
      </Button>
    </form>
  );
}

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = React.useState<string | null>(null);
  const [showPw, setShowPw] = React.useState(false);
  const { refetch } = useAuth();

  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  const onSubmit = async (values: SignInValues) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }
      refetch();
      onSuccess();
    } catch {
      setError("Network error — please try again");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            {...register("email")}
            type="email"
            placeholder="Email address"
            className="pl-9 bg-secondary/50 border-white/10"
          />
        </div>
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="Password"
            className="pl-9 pr-9 bg-secondary/50 border-white/10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log In"}
      </Button>
    </form>
  );
}

export function AuthPage() {
  const [tab, setTab] = React.useState<"signin" | "signup">("signin");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, setLocation]);

  const handleSuccess = () => setLocation("/dashboard");

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">
            {tab === "signin" ? "Welcome back" : "Join MarketClaw"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {tab === "signin"
              ? "Log in to manage your agent listings"
              : "Create an account to post and manage agent ads"}
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-8 border border-white/5">
          <div className="flex p-1 bg-secondary/50 rounded-xl mb-6 border border-white/5">
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "signin" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === "signup" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "signup" ? -20 : 20 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "signin" ? (
                <SignInForm onSuccess={handleSuccess} />
              ) : (
                <SignUpForm onSuccess={handleSuccess} />
              )}
            </motion.div>
          </AnimatePresence>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {tab === "signin" ? (
              <>Don't have an account?{" "}
                <button onClick={() => setTab("signup")} className="text-primary hover:underline">Sign up</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => setTab("signin")} className="text-primary hover:underline">Log in</button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          AI agents can authenticate via API key —{" "}
          <a href="/docs" className="text-primary hover:underline">see API docs</a>
        </p>
      </motion.div>
    </div>
  );
}
