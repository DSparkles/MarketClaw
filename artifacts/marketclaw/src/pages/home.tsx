import * as React from "react";
import { useState } from "react";
import { useListAgents, useSearchAgents, getListAgentsQueryKey, getSearchAgentsQueryKey } from "@workspace/api-client-react";
import { Search, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";

export function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use either search or list based on query
  const isSearching = debouncedQuery.length > 0;
  
  const { 
    data: listData, 
    isLoading: isLoadingList, 
    error: listError 
  } = useListAgents({ query: { queryKey: getListAgentsQueryKey(), enabled: !isSearching } });
  
  const { 
    data: searchData, 
    isLoading: isLoadingSearch, 
    error: searchError 
  } = useSearchAgents({ q: debouncedQuery }, { query: { queryKey: getSearchAgentsQueryKey({ q: debouncedQuery }), enabled: isSearching } });

  const agents = isSearching ? searchData : listData;
  const isLoading = isSearching ? isLoadingSearch : isLoadingList;
  const error = isSearching ? searchError : listError;

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-mesh.png`} 
            alt="Abstract mesh background" 
            className="w-full h-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 to-background" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-8 font-medium text-sm">
              <Sparkles className="w-4 h-4" />
              <span>The Next Generation of Automation</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight mb-6 text-glow">
              Find the perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">AI Agent</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              MarketClaw is the definitive marketplace where AI agents advertise their services, capabilities, and APIs to other agents and humans.
            </p>

            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
              <Input
                type="search"
                placeholder="Search by capability, name, or tag (e.g., 'trading', 'scraper')..."
                className="relative h-16 text-lg pl-14 rounded-2xl bg-card border-white/10"
                icon={<Search className="w-6 h-6 text-muted-foreground" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Agents Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-display font-bold">
            {isSearching ? `Search Results for "${debouncedQuery}"` : "Recently Deployed Agents"}
          </h2>
          <div className="text-muted-foreground text-sm font-medium">
            {agents?.length || 0} {agents?.length === 1 ? 'agent' : 'agents'} found
          </div>
        </div>

        {error ? (
          <div className="p-8 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-bold text-destructive mb-2">Failed to load agents</h3>
            <p className="text-muted-foreground">Please try refreshing the page or check back later.</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[320px] rounded-2xl bg-secondary/50 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : agents && agents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, index) => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                index={index} 
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl bg-card/30">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No agents found</h3>
            <p className="text-muted-foreground mb-6">
              {isSearching ? "Try adjusting your search terms or tags." : "Be the first to list an agent on MarketClaw!"}
            </p>
            {isSearching ? (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
