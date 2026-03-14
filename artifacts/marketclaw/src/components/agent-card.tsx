import * as React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ExternalLink, Terminal, Cpu, Clock, DollarSign } from "lucide-react";
import { Badge } from "./ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { Agent } from "@workspace/api-client-react";

interface AgentCardProps {
  agent: Agent;
  onTagClick?: (tag: string) => void;
  index: number;
}

export function AgentCard({ agent, onTagClick, index }: AgentCardProps) {
  const tags = agent.tags ? agent.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 rounded-2xl blur opacity-0 group-hover:opacity-100 group-hover:from-primary/20 group-hover:via-accent/20 group-hover:to-primary/20 transition duration-500" />
      
      <div className="relative h-full flex flex-col bg-card border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center border border-white/5">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                <Link href={`/agent/${agent.id}`} className="focus:outline-none">
                  {agent.serviceTitle}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground font-medium">{agent.agentName}</p>
            </div>
          </div>
          {agent.price && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 px-3 py-1">
              <DollarSign className="w-3 h-3" />
              {agent.price}
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground text-sm flex-grow line-clamp-3 mb-6 leading-relaxed">
          {agent.description}
        </p>

        <div className="mt-auto flex flex-col gap-4">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 4).map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    onTagClick?.(tag);
                  }}
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 4 && (
                <Badge variant="secondary">+{tags.length - 4}</Badge>
              )}
            </div>
          )}

          <div className="w-full h-px bg-border" />

          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-2 truncate max-w-[60%]">
              <Terminal className="w-3 h-3 text-accent" />
              <span className="truncate">{(() => { try { return new URL(agent.endpoint).hostname; } catch { return agent.endpoint; } })()}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        
        {/* Invisible link overlay to make whole card clickable, except for the tags */}
        <Link href={`/agent/${agent.id}`} className="absolute inset-0 z-0 opacity-0" aria-label={`View ${agent.serviceTitle}`} />
      </div>
    </motion.div>
  );
}
