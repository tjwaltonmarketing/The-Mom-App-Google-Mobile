import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, X, Check } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

interface ShareModalProps {
  onShare: (platform: "facebook" | "instagram") => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function ShareModal({ onShare, onSkip, isLoading = false }: ShareModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<"facebook" | "instagram" | null>(null);
  const [hasOpened, setHasOpened] = useState(false);

  const openShareDialog = (platform: "facebook" | "instagram") => {
    setSelectedPlatform(platform);
    setHasOpened(true);
    
    const shareUrl = "https://themom.app";
    const shareText = "I just discovered The Mom App - it's like having a personal assistant for all the family chaos! Check it out:";
    
    if (platform === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
        "_blank",
        "width=600,height=400"
      );
    } else if (platform === "instagram") {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    }
  };

  const handleClaim = () => {
    if (selectedPlatform) {
      onShare(selectedPlatform);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-4 py-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-100 rounded-full mb-4">
          <Gift className="h-10 w-10 text-pink-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          But wait... before you dive in!
        </h1>

        <p className="text-gray-600">
          Do you know any other moms that could use a break?
        </p>

        <Card className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0">
          <CardContent className="p-4">
            <p className="font-semibold text-lg">Share on social media</p>
            <p className="text-pink-100 text-sm">Get an additional week FREE!</p>
          </CardContent>
        </Card>

        <p className="text-gray-700 font-medium">
          That's 21 days total to try everything!
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => openShareDialog("facebook")}
            disabled={isLoading}
            className={`py-6 text-base flex items-center justify-center gap-2 ${
              selectedPlatform === "facebook" 
                ? "bg-[#1877F2] ring-2 ring-offset-2 ring-[#1877F2]" 
                : "bg-[#1877F2] hover:bg-[#166FE5]"
            } text-white`}
          >
            {selectedPlatform === "facebook" ? <Check className="h-5 w-5" /> : <FaFacebook className="h-5 w-5" />}
            Facebook
          </Button>

          <Button
            onClick={() => openShareDialog("instagram")}
            disabled={isLoading}
            className={`py-6 text-base flex items-center justify-center gap-2 ${
              selectedPlatform === "instagram"
                ? "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] ring-2 ring-offset-2 ring-pink-500"
                : "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90"
            } text-white`}
          >
            {selectedPlatform === "instagram" ? <Check className="h-5 w-5" /> : <FaInstagram className="h-5 w-5" />}
            Instagram
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          {selectedPlatform === "instagram" 
            ? "Link copied! Paste it on Instagram to share."
            : "(Instagram will copy the share link to your clipboard)"}
        </p>

        <Button
          onClick={handleClaim}
          disabled={isLoading || !hasOpened}
          className={`w-full py-6 text-lg ${hasOpened ? 'bg-pink-500 hover:bg-pink-600' : 'bg-gray-300 cursor-not-allowed'} text-white`}
        >
          {isLoading ? "CLAIMING YOUR BONUS..." : "CLAIM MY ADDITIONAL FREE WEEK!"}
        </Button>

        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className="w-full text-gray-500 hover:text-gray-700"
        >
          <X className="mr-2 h-4 w-4" />
          No thanks, take me to the app
        </Button>
      </div>
    </div>
  );
}
