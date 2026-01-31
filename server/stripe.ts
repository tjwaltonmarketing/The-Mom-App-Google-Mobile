import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export const PRICE_IDS = {
  individual_monthly: "price_individual_monthly",
  individual_yearly: "price_individual_yearly", 
  family_monthly: "price_family_monthly",
  family_yearly: "price_family_yearly",
};

export const PLAN_DETAILS = {
  individual: {
    name: "Individual Plan",
    monthly: { price: 599, interval: "month" as const },
    yearly: { price: 5999, interval: "year" as const },
  },
  family: {
    name: "Family Plan",
    monthly: { price: 999, interval: "month" as const },
    yearly: { price: 9999, interval: "year" as const },
  },
};

let productsInitialized = false;
let actualPriceIds: Record<string, string> = {};

export async function initializeStripeProducts() {
  if (productsInitialized) return actualPriceIds;

  try {
    const existingProducts = await stripe.products.list({ limit: 100 });
    const existingPrices = await stripe.prices.list({ limit: 100, active: true });

    for (const [planKey, plan] of Object.entries(PLAN_DETAILS)) {
      let product = existingProducts.data.find(p => p.metadata.plan_key === planKey);
      
      if (!product) {
        product = await stripe.products.create({
          name: plan.name,
          metadata: { plan_key: planKey },
        });
      }

      for (const [intervalKey, details] of Object.entries({ monthly: plan.monthly, yearly: plan.yearly })) {
        const priceKey = `${planKey}_${intervalKey}`;
        let price = existingPrices.data.find(
          p => p.product === product!.id && 
               p.recurring?.interval === details.interval &&
               p.unit_amount === details.price
        );

        if (!price) {
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: details.price,
            currency: "usd",
            recurring: { interval: details.interval },
            metadata: { price_key: priceKey },
          });
        }

        actualPriceIds[priceKey] = price.id;
      }
    }

    productsInitialized = true;
    console.log("Stripe products initialized:", actualPriceIds);
    return actualPriceIds;
  } catch (error) {
    console.error("Failed to initialize Stripe products:", error);
    throw error;
  }
}

export async function createCheckoutSession(
  userId: number,
  email: string,
  plan: "individual" | "family",
  interval: "monthly" | "yearly",
  successUrl: string,
  cancelUrl: string
) {
  await initializeStripeProducts();
  
  const priceKey = `${plan}_${interval}`;
  const priceId = actualPriceIds[priceKey];

  if (!priceId) {
    throw new Error(`Price not found for ${priceKey}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: userId.toString(),
      plan,
      interval,
    },
    subscription_data: {
      metadata: {
        userId: userId.toString(),
        plan,
        interval,
      },
    },
  });

  return session;
}

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: "checkout_completed",
        userId: session.metadata?.userId ? parseInt(session.metadata.userId) : null,
        plan: session.metadata?.plan as "individual" | "family" | undefined,
        interval: session.metadata?.interval as "monthly" | "yearly" | undefined,
        subscriptionId: session.subscription as string,
        customerId: session.customer as string,
      };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      return {
        type: event.type === "customer.subscription.deleted" ? "subscription_cancelled" : "subscription_updated",
        userId: subscription.metadata?.userId ? parseInt(subscription.metadata.userId) : null,
        status: subscription.status,
        subscriptionId: subscription.id,
      };
    }
    default:
      return null;
  }
}
