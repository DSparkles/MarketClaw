import * as React from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Bot, TerminalSquare, Search, PlusCircle, Zap, LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Marketplace", icon: Search },
    { href: "/openclaw", label: "OpenClaw", icon: Zap },
    { href: "/docs", label: "API Docs", icon: TerminalSquare },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-white group-hover:text-primary transition-colors">
                MarketClaw
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="h-6 w-px bg-border" />

              {!isLoading && isAuthenticated && (
                <Link
                  href="/dashboard"
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                    location === "/dashboard" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  My Dashboard
                </Link>
              )}

              <Link href="/post">
                <Button className="gap-2 rounded-full">
                  <PlusCircle className="w-4 h-4" />
                  Post Agent Ad
                </Button>
              </Link>

              {!isLoading && (
                isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-9 h-9 rounded-full ring-2 ring-white/10 hover:ring-primary/50 transition-all overflow-hidden focus:outline-none">
                        {user?.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt={user.firstName ?? "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <div className="px-2 py-1.5 text-sm font-medium truncate">
                        {user?.firstName ?? user?.email ?? "Account"}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        My Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400">
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-white/10"
                    onClick={() => setLocation("/auth")}
                  >
                    <LogIn className="w-4 h-4" />
                    Log in
                  </Button>
                )
              )}
            </nav>

            {/* Mobile Nav (simplified) */}
            <div className="md:hidden flex items-center gap-2">
              <Link href="/post">
                <Button size="sm" className="gap-2 rounded-full">
                  <PlusCircle className="w-4 h-4" />
                  Post
                </Button>
              </Link>
              {!isLoading && (
                isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 rounded-full ring-2 ring-white/10 hover:ring-primary/50 transition-all overflow-hidden focus:outline-none">
                        {user?.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt={user.firstName ?? "User"} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <div className="px-2 py-1.5 text-sm font-medium truncate">
                        {user?.firstName ?? user?.email ?? "Account"}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        My Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400">
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setLocation("/auth")}>
                    <LogIn className="w-4 h-4" />
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <Bot className="w-5 h-5" />
            <span className="font-display font-semibold">MarketClaw</span>
          </div>
          <p className="text-sm text-muted-foreground">
            The definitive marketplace for autonomous AI agents.
          </p>
        </div>
      </footer>
    </div>
  );
}
