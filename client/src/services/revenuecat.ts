import { Capacitor, registerPlugin } from "@capacitor/core";

interface RevenueCatPluginInterface {
  configure(options: { apiKey: string }): Promise<{ success: boolean; alreadyConfigured?: boolean }>;
  logIn(options: { appUserID: string }): Promise<{ success: boolean; created: boolean; customerInfo: CustomerInfo }>;
  logOut(): Promise<{ success: boolean }>;
  getOfferings(): Promise<{ packages: RCPackage[] }>;
  purchasePackage(options: { productIdentifier: string }): Promise<{ success: boolean; cancelled: boolean; customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<{ success: boolean; customerInfo: CustomerInfo }>;
  getCustomerInfo(): Promise<{ success: boolean; customerInfo: CustomerInfo }>;
}

export interface RCPackage {
  identifier: string;
  packageType: string;
  productIdentifier: string;
  localizedTitle: string;
  localizedDescription: string;
  priceString: string;
  price: number;
  introPrice?: {
    priceString: string;
    price: number;
    periodDays: number;
    paymentMode: string;
  };
}

export interface CustomerInfo {
  activeEntitlements: string[];
  activeSubscriptions: string[];
  latestExpirationDate?: string;
  entitlements: Array<{
    identifier: string;
    isActive: boolean;
    productIdentifier: string;
    willRenew: boolean;
    expirationDate?: string;
  }>;
}

const REVENUECAT_APPLE_API_KEY = import.meta.env.VITE_REVENUECAT_APPLE_API_KEY || "appl_jWnxLTGgndDEuLfvrDcnukFGGIp";
const REVENUECAT_GOOGLE_API_KEY = import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY || "goog_XcuuBhvjFivaiWvlJDMHrsRmJhX";

const platform = Capacitor.getPlatform();

const RevenueCatNative = (platform === "ios" || platform === "android")
  ? registerPlugin<RevenueCatPluginInterface>("RevenueCatPlugin")
  : null;

let initialized = false;

export function isRevenueCatAvailable(): boolean {
  if (platform === "ios") return !!REVENUECAT_APPLE_API_KEY;
  if (platform === "android") return !!REVENUECAT_GOOGLE_API_KEY;
  return false;
}

export let lastInitError: string = "";

export async function initRevenueCat(): Promise<boolean> {
  if (!isRevenueCatAvailable() || !RevenueCatNative) {
    lastInitError = `Not available: platform=${platform}, hasAppleKey=${!!REVENUECAT_APPLE_API_KEY}, hasGoogleKey=${!!REVENUECAT_GOOGLE_API_KEY}, hasNative=${!!RevenueCatNative}`;
    return false;
  }
  if (initialized) return true;

  const apiKey = platform === "android" ? REVENUECAT_GOOGLE_API_KEY : REVENUECAT_APPLE_API_KEY;

  try {
    const result = await RevenueCatNative.configure({ apiKey });
    initialized = result.success;
    console.log("[RevenueCat] Initialized:", result);
    if (!result.success) lastInitError = "configure returned success=false";
    return initialized;
  } catch (error: any) {
    lastInitError = error?.message || error?.toString() || "Unknown error";
    console.error("[RevenueCat] Init failed:", error);
    return false;
  }
}

export async function revenueCatLogIn(userId: string): Promise<CustomerInfo | null> {
  if (!RevenueCatNative || !initialized) return null;

  try {
    const result = await RevenueCatNative.logIn({ appUserID: `app_user_${userId}` });
    console.log("[RevenueCat] Logged in:", result);
    return result.customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Login failed:", error);
    return null;
  }
}

export async function revenueCatLogOut(): Promise<void> {
  if (!RevenueCatNative || !initialized) return;

  try {
    await RevenueCatNative.logOut();
  } catch (error) {
    console.error("[RevenueCat] Logout failed:", error);
  }
}

export async function getOfferings(): Promise<RCPackage[]> {
  if (!RevenueCatNative || !initialized) return [];

  try {
    const result = await RevenueCatNative.getOfferings();
    console.log("[RevenueCat] Offerings:", result);
    return result.packages || [];
  } catch (error) {
    console.error("[RevenueCat] getOfferings failed:", error);
    return [];
  }
}

export async function purchaseProduct(productIdentifier: string): Promise<{
  success: boolean;
  cancelled: boolean;
  customerInfo?: CustomerInfo;
}> {
  if (!RevenueCatNative || !initialized) {
    return { success: false, cancelled: false };
  }

  try {
    const result = await RevenueCatNative.purchasePackage({ productIdentifier });
    return result;
  } catch (error: any) {
    console.error("[RevenueCat] Purchase failed:", error);
    return { success: false, cancelled: false };
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!RevenueCatNative || !initialized) return null;

  try {
    const result = await RevenueCatNative.restorePurchases();
    return result.customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Restore failed:", error);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!RevenueCatNative || !initialized) return null;

  try {
    const result = await RevenueCatNative.getCustomerInfo();
    return result.customerInfo;
  } catch (error) {
    console.error("[RevenueCat] getCustomerInfo failed:", error);
    return null;
  }
}

export function mapProductToplan(productIdentifier: string): {
  plan: "individual" | "family";
  interval: "monthly" | "yearly";
} | null {
  // Strip Google Play base plan suffix (e.g. com.momapp.individual.monthly:individual-monthly → com.momapp.individual.monthly)
  const baseId = productIdentifier.split(":")[0];
  const mapping: Record<string, { plan: "individual" | "family"; interval: "monthly" | "yearly" }> = {
    "com.momapp.individual.monthly": { plan: "individual", interval: "monthly" },
    "com.momapp.individual.yearly": { plan: "individual", interval: "yearly" },
    "com.momapp.family.monthly": { plan: "family", interval: "monthly" },
    "com.momapp.family.yearly": { plan: "family", interval: "yearly" },
  };
  return mapping[baseId] || null;
}

export function getPackageForPlan(
  packages: RCPackage[],
  plan: "individual" | "family",
  interval: "monthly" | "yearly"
): RCPackage | undefined {
  const productId = `com.momapp.${plan}.${interval}`;
  // Google Play appends :basePlanId to subscription IDs (e.g. com.momapp.individual.monthly:individual-monthly)
  return packages.find(
    (p) => p.productIdentifier === productId || p.productIdentifier.startsWith(productId + ":")
  );
}
