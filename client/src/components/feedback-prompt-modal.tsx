import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Star, ExternalLink } from "lucide-react";

type FeedbackStep = "initial" | "positive" | "negative" | "thanks";

export function FeedbackPromptModal() {
  const [step, setStep] = useState<FeedbackStep>("initial");
  const [feedbackText, setFeedbackText] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const queryClient = useQueryClient();

  const { data: shouldShow } = useQuery<{ shouldShow: boolean; promptId?: number }>({
    queryKey: ["/api/feedback-prompt/check"],
  });

  const respondMutation = useMutation({
    mutationFn: async (data: { response: string; feedbackText?: string; reviewRequested?: boolean; remindLater?: boolean }) => {
      return apiRequest("/api/feedback-prompt/respond", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback-prompt/check"] });
    },
  });

  const handleYes = () => {
    respondMutation.mutate({ response: "yes" });
    setStep("positive");
  };

  const handleNo = () => {
    setStep("negative");
  };

  const handleLeaveReview = () => {
    respondMutation.mutate({ response: "yes", reviewRequested: true });
    window.open("https://play.google.com/store/apps/details?id=com.themomapp", "_blank");
    setStep("thanks");
    setTimeout(() => setIsOpen(false), 2000);
  };

  const handleMaybeLater = () => {
    respondMutation.mutate({ response: "yes", remindLater: true });
    setIsOpen(false);
  };

  const handleSubmitFeedback = () => {
    respondMutation.mutate({ response: "no", feedbackText });
    setStep("thanks");
    setTimeout(() => setIsOpen(false), 2000);
  };

  const handleClose = () => {
    if (step === "initial") {
      respondMutation.mutate({ response: "dismissed", remindLater: true });
    }
    setIsOpen(false);
  };

  if (!shouldShow?.shouldShow) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="feedback-prompt-modal">
        {step === "initial" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Heart className="h-6 w-6 text-pink-500" />
                Quick Question!
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Are you liking The Mom App so far?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleYes}
                className="flex-1 bg-green-500 hover:bg-green-600"
                data-testid="feedback-yes-btn"
              >
                Yes! 👍
              </Button>
              <Button
                onClick={handleNo}
                variant="outline"
                className="flex-1"
                data-testid="feedback-no-btn"
              >
                Not really 👎
              </Button>
            </div>
          </>
        )}

        {step === "positive" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Star className="h-6 w-6 text-yellow-500" />
                That's wonderful!
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                We're super excited to hear that! Would you mind leaving us a quick review? It really helps other moms find us.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleLeaveReview}
                className="flex-1 bg-pink-500 hover:bg-pink-600"
                data-testid="leave-review-btn"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Sure!
              </Button>
              <Button
                onClick={handleMaybeLater}
                variant="outline"
                className="flex-1"
                data-testid="maybe-later-btn"
              >
                Maybe Later
              </Button>
            </div>
          </>
        )}

        {step === "negative" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <MessageCircle className="h-6 w-6 text-blue-500" />
                We're sorry to hear that
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                What could we do to make the experience better?
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what's not working for you..."
              className="min-h-[100px] mt-4"
              data-testid="feedback-textarea"
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleSubmitFeedback}
                className="flex-1 bg-pink-500 hover:bg-pink-600"
                disabled={!feedbackText.trim()}
                data-testid="submit-feedback-btn"
              >
                Send Feedback
              </Button>
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="flex-1"
              >
                Skip
              </Button>
            </div>
          </>
        )}

        {step === "thanks" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Heart className="h-6 w-6 text-pink-500" />
                Thank you!
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                We really appreciate your feedback! 💕
              </DialogDescription>
            </DialogHeader>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
