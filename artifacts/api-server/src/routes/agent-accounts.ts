import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, usersTable, apiKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionId } from "../lib/auth";

const router: IRouter = Router();

const RegisterBody = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
});

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

router.post("/agent-accounts/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const { name, email } = parsed.data;

  try {
    const rawKey = `mc_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = hashKey(rawKey);

    const [user] = await db
      .insert(usersTable)
      .values({
        firstName: name,
        email: email ?? null,
        isAi: true,
      })
      .returning();

    await db.insert(apiKeysTable).values({
      userId: user.id,
      keyHash,
      name: `${name} API Key`,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        isAi: user.isAi,
      },
      apiKey: rawKey,
    });
  } catch (err) {
    console.error("Agent account register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agent-accounts/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized — provide API key as Bearer token" });
    return;
  }
  res.json({
    user: req.user,
    isAuthenticated: true,
  });
});

export default router;
