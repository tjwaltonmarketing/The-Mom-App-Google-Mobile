import { sendEmail } from "./email-service";
import { db } from "./db";
import { winbackDrip, users, userSubscriptions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const WINBACK_DAYS = [2, 5, 10];

const SUBJECTS: Record<number, string> = {
  2: "Your free trial is still waiting 💕",
  5: "25% off The Mom App — 48 hours only",
  10: "Last chance: 25% off expires tonight 💕",
};

const MESSAGES: Record<number, (name: string) => string> = {
  2: (name) => `
    <p>Hey ${name}! 💕</p>
    <p>You were so close to simplifying your family life with The Mom App. Your 14-day free trial is still waiting — no charge today.</p>
    <p><a href="https://app.themom.app/login">Start your free trial →</a></p>
    <p>Mom Life. Made Easy.</p>
  `,
  5: (name) => `
    <p>Hey ${name}!</p>
    <p>Still thinking it over? Here's <strong>25% off your first month</strong> of The Mom App — only good for the next 48 hours.</p>
    <p><a href="https://app.themom.app/login?coupon=WINBACK25">Claim 25% off →</a></p>
    <p>Mom Life. Made Easy.</p>
  `,
  10: (name) => `
    <p>Hey ${name}!</p>
    <p>Last chance — your 25% off The Mom App expires tonight. Don't miss out 💕</p>
    <p><a href="https://app.themom.app/login?coupon=WINBACK25">Claim your discount →</a></p>
    <p>Mom Life. Made Easy.</p>
  `,
};

// ─── KILL SWITCH ────────────────────────────────────────────────────────────
// The campaign will NOT send real emails unless WINBACK_EMAIL_ENABLED=true
// is set as an environment variable. Remove this check only when ready to go live.
const CAMPAIGN_LIVE = process.env.WINBACK_EMAIL_ENABLED === "true";

export async function runWinbackDripCheck() {
  try {
    if (!CAMPAIGN_LIVE) {
      console.log("💌 Winback drip: DRY RUN mode (set WINBACK_EMAIL_ENABLED=true to go live)");
    }

    const now = new Date();

    const candidates = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        email: users.email,
        createdAt: users.createdAt,
        stripeSubId: userSubscriptions.stripeSubscriptionId,
        appleProductId: userSubscriptions.appleProductId,
        googleProductId: userSubscriptions.googleProductId,
        subscriptionStatus: userSubscriptions.subscriptionStatus,
      })
      .from(users)
      .leftJoin(userSubscriptions, eq(userSubscriptions.userId, users.id))
      .where(sql`${users.email} IS NOT NULL AND ${users.createdAt} IS NOT NULL`);

    const ACTIVE_STATUSES = ["active", "trial"];
    const nonPaying = candidates.filter(
      (u) =>
        !u.stripeSubId &&
        !u.appleProductId &&
        !u.googleProductId &&
        !ACTIVE_STATUSES.includes(u.subscriptionStatus || "")
    );

    const sentRecords = await db.select().from(winbackDrip);
    const sentSet = new Set(sentRecords.map((r) => `${r.userId}-${r.day}`));

    for (const user of nonPaying) {
      if (!user.createdAt || !user.email) continue;

      const daysSinceSignup = Math.floor(
        (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const day of WINBACK_DAYS) {
        const key = `${user.id}-${day}`;

        if (daysSinceSignup < day || daysSinceSignup >= day + 1) continue;
        if (sentSet.has(key)) continue;

        const subject = SUBJECTS[day];
        const html = MESSAGES[day](user.firstName || "there");

        if (!CAMPAIGN_LIVE) {
          console.log(`💌 [DRY RUN] Would send day ${day} email to user ${user.id} (${user.email}): "${subject}"`);
          continue;
        }

        const sent = await sendEmail(user.email, subject, html);

        if (sent) {
          await db.insert(winbackDrip).values({ userId: user.id, day });
          console.log(`✅ Winback day ${day} email sent to user ${user.id}`);
        } else {
          console.log(`⚠️ Winback day ${day} email failed for user ${user.id}`);
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
    console.log("💌 Winback drip scheduler initialized — LIVE MODE (email)");
  } else {
    console.log("💌 Winback drip scheduler initialized — DRY RUN (no emails will be sent)");
  }
}
