import { OnboardingFlow } from "@/components/onboarding-flow";

export default function OnboardingPreview() {
  const params = new URLSearchParams(window.location.search);
  const slide = parseInt(params.get("slide") || "0", 10);

  return (
    <OnboardingFlow
      initialSlide={slide}
      onComplete={() => {}}
      onStartTrial={() => {}}
    />
  );
}
