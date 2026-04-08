import { sendSMS } from "./sms-service";
import { db } from "./db";
import { winbackDrip, users, userSubscriptions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const WINBACK_DAYS = [2, 5, 10];

const MESSAGES: Record<number, (name: string) => string> = {
  2: (name) =>
    `Hey, ${name}! 💕 You were so close to simplifying your family life with The Mom App. Your 14-day free trial is still waiting — no charge today. Ready? https://app.themom.app/login`,
  5: (name) =>
    `Hey, ${name}! Still thinking it over? Here's 25% off your first month of The Mom App — only good for the next 48 hours. 👉 https://app.themom.app/login?coupon=WINBACK25`,
  10: (name) =>
    `Hey, ${name}! Last chance — your 25% off The Mom App expires tonight. Don't miss out 💕 https://app.themom.app/login?coupon=WINBACK25`,
};

// ─── KILL SWITCH ────────────────────────────────────────────────────────────
// The campaign will NOT send real texts unless WINBACK_DRIP_ENABLED=true
// is set as an environment variable. Remove this check only when ready to go live.
const CAMPAIGN_LIVE = process.env.WINBACK_DRIP_ENABLED === "true";

export async function runWinbackDripCheck() {
  try {
    if (!CAMPAIGN_LIVE) {
      console.log("💌 Winback drip: DRY RUN mode (set WINBACK_DRIP_ENABLED=true to go live)");
    }

    const now = new Date();

    // Find users who:
    // 1. Have a phone number
    // 2. Never completed checkout (no stripeSubscriptionId and no appleProductId)
    const candidates = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt,
        stripeSubId: userSubscriptions.stripeSubscriptionId,
        appleProductId: userSubscriptions.appleProductId,
      })
      .from(users)
      .leftJoin(userSubscriptions, eq(userSubscriptions.userId, users.id))
      .where(sql`${users.phoneNumber} IS NOT NULL AND ${users.createdAt} IS NOT NULL`);

    // Filter to non-paying users (no Stripe or Apple subscription)
    const nonPaying = candidates.filter(
      (u) => !u.stripeSubId && !u.appleProductId
    );

    // Get already-sent winback records
    const sentRecords = await db.select().from(winbackDrip);
    const sentSet = new Set(sentRecords.map((r) => `${r.userId}-${r.day}`));

    for (const user of nonPaying) {
      if (!user.createdAt || !user.phoneNumber) continue;

      const daysSinceSignup = Math.floor(
        (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const day of WINBACK_DAYS) {
        const key = `${user.id}-${day}`;

        // Send within the 24h window of the target day
        if (daysSinceSignup < day || daysSinceSignup >= day + 1) continue;
        if (sentSet.has(key)) continue;

        const message = MESSAGES[day](user.firstName || "");

        if (!CAMPAIGN_LIVE) {
          // Dry run — log what would be sent, don't actually send or record
          console.log(`💌 [DRY RUN] Would send day ${day} SMS to user ${user.id} (${user.phoneNumber}): "${message}"`);
          continue;
        }

        const sent = await sendSMS(user.phoneNumber, message);

        if (sent) {
          await db.insert(winbackDrip).values({ userId: user.id, day });
          console.log(`✅ Winback day ${day} SMS sent to user ${user.id}`);
        } else {
          console.log(`⚠️ Winback day ${day} SMS failed for user ${user.id}`);
        }
      }
    }

    console.log(`💌 Winback check complete — ${nonPaying.length} non-paying users evaluated`);
  } catch (error) {
    console.error("Winback drip check error:", error);
  }
}

export function initWinbackDripScheduler() {
  runWinbackDripCheck();
  setInterval(runWinbackDripCheck, 60 * 60 * 1000);
  if (CAMPAIGN_LIVE) {
    console.log("💌 Winback drip scheduler initialized — LIVE MODE");
  } else {
    console.log("💌 Winback drip scheduler initialized — DRY RUN (no texts will be sent)");
  }
}
