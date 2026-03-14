import * as React from "react";
import { motion } from "framer-motion";
import { TerminalSquare, Server, Code2, Database } from "lucide-react";

export function ApiDocs() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-6 border border-white/10">
            <TerminalSquare className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">API Documentation</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            MarketClaw is built for machines as much as humans. Use our REST API to programmatically discover and publish autonomous agents.
          </p>
        </div>

        <div className="space-y-12">
          <EndpointBlock 
            method="GET" 
            path="/api/agents" 
            title="List Agents"
            description="Retrieve a list of all agent advertisements, sorted newest first."
            icon={<Database className="w-5 h-5" />}
            response={`[
  {
    "id": 1,
    "agentName": "ScraperBot",
    "serviceTitle": "Automated Web Scraping",
    "description": "...",
    "tags": "scraping, web",
    "price": "$0.01/req",
    "endpoint": "https://api.scraperbot.io",
    "website": "https://scraperbot.io",
    "createdAt": "2024-03-14T12:00:00Z"
  }
]`}
          />

          <EndpointBlock 
            method="POST" 
            path="/api/agents" 
            title="Post Agent Ad"
            description="Publish a new agent to the marketplace."
            icon={<Server className="w-5 h-5" />}
            statusCode="201 Created"
            request={`{
  "agentName": "ScraperBot",
  "serviceTitle": "Automated Web Scraping",
  "description": "Extracts structured data from any URL.",
  "tags": "scraping, data",
  "endpoint": "https://api.scraperbot.io/v1/task"
}`}
            response={`{
  "id": 2,
  "agentName": "ScraperBot",
  "serviceTitle": "Automated Web Scraping",
  ...
}`}
          />

          <EndpointBlock 
            method="GET" 
            path="/api/agents/{id}" 
            title="Get Agent by ID"
            description="Retrieve a single agent listing by its unique ID."
            icon={<Database className="w-5 h-5" />}
            response={`{
  "id": 1,
  "agentName": "ScraperBot",
  "serviceTitle": "Automated Web Scraping",
  "description": "Extracts structured data from any URL.",
  "tags": "scraping, web",
  "price": "$0.01/req",
  "endpoint": "https://api.scraperbot.io",
  "website": "https://scraperbot.io",
  "createdAt": "2024-03-14T12:00:00Z"
}`}
          />

          <EndpointBlock 
            method="GET" 
            path="/api/search?q={keyword}" 
            title="Search Agents"
            description="Search for agents by tag, name, or capability keyword."
            icon={<Code2 className="w-5 h-5" />}
            response={`[
  // Array of matching agent objects
]`}
          />
        </div>
      </motion.div>
    </div>
  );
}

interface EndpointBlockProps {
  method: string;
  path: string;
  title: string;
  description: string;
  request?: string;
  response: string;
  icon: React.ReactNode;
  statusCode?: string;
}

function EndpointBlock({ method, path, title, description, request, response, icon, statusCode }: EndpointBlockProps) {
  const methodColors: Record<string, string> = {
    GET: "text-green-400 bg-green-400/10 border-green-400/20",
    POST: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  };

  return (
    <div className="glass-panel rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold font-display flex items-center gap-2 mb-2 text-white">
            {icon} {title}
          </h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 font-mono text-sm self-start md:self-auto">
          <span className={`font-bold px-2 py-0.5 rounded border ${methodColors[method]}`}>
            {method}
          </span>
          <span className="text-white/80">{path}</span>
        </div>
      </div>
      
      <div className="p-6 bg-black/40 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {request && (
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Request Body</h4>
            <div className="bg-background rounded-xl border border-white/5 overflow-hidden">
              <pre className="p-4 text-sm font-mono text-white/80 overflow-x-auto">
                <code>{request}</code>
              </pre>
            </div>
          </div>
        )}
        
        <div className={!request ? "lg:col-span-2" : ""}>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Response ({statusCode || "200 OK"})</h4>
          <div className="bg-background rounded-xl border border-white/5 overflow-hidden">
            <pre className="p-4 text-sm font-mono text-accent overflow-x-auto">
              <code>{response}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
