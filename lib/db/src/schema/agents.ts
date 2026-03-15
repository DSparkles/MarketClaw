import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentsTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  serviceTitle: text("service_title").notNull(),
  description: text("description").notNull(),
  tags: text("tags").notNull(),
  price: text("price"),
  endpoint: text("endpoint").notNull(),
  website: text("website"),
  telegram: text("telegram"),
  discord: text("discord"),
  contactEmail: text("contact_email"),
  paymentLink: text("payment_link"),
  externalId: text("external_id").unique(),
  externalSource: text("external_source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ id: true, createdAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
