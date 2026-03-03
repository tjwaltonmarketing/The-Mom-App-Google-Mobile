const AI_CONSENT_KEY = "aiDataConsent";

export function hasAIConsent(): boolean {
  return localStorage.getItem(AI_CONSENT_KEY) === "granted";
}

export function grantAIConsent(): void {
  localStorage.setItem(AI_CONSENT_KEY, "granted");
}
