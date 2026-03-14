import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";

const VIDEO_ID = "cmLFuM73wco";
const TUTORIAL_VIDEO_EMBED = `https://www.youtube.com/embed/${VIDEO_ID}`;
const TUTORIAL_VIDEO_WATCH = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

export default function VideoTutorials() {
  const isNative = Capacitor.getPlatform() !== "web";

  const openInYouTube = () => {
    window.open(TUTORIAL_VIDEO_WATCH, "_system");
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-background">
      <Header onStartVoiceNote={() => {}} />
      <MobileNav />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36 lg:pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
            <Play className="w-5 h-5 text-pink-500 fill-pink-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Getting Started</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Watch this video to get the most out of The Mom App</p>
          </div>
        </div>

        {isNative ? (
          <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 p-10 flex flex-col items-center justify-center gap-5 aspect-video">
            <div className="w-16 h-16 rounded-full bg-pink-500 flex items-center justify-center shadow-lg">
              <Play className="w-8 h-8 fill-white text-white ml-1" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium text-center">Tap below to watch the tutorial in YouTube</p>
            <Button onClick={openInYouTube} className="bg-pink-500 hover:bg-pink-600 text-white gap-2">
              <ExternalLink className="w-4 h-4" />
              Watch on YouTube
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black">
            <iframe
              src={TUTORIAL_VIDEO_EMBED}
              title="The Mom App Tutorial"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Have questions? Visit the <a href="/tutorials" className="text-pink-500 font-medium hover:underline">Help & Tutorials</a> section for more tips.
        </p>
      </main>
    </div>
  );
}
