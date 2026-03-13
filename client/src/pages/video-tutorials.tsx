import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Play } from "lucide-react";

const TUTORIAL_VIDEO_URL = "https://www.youtube.com/embed/cmLFuM73wco";

export default function VideoTutorials() {
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Watch this short video to get the most out of The Mom App</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black">
          <iframe
            src={TUTORIAL_VIDEO_URL}
            title="The Mom App Tutorial"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Have questions? Visit the <a href="/tutorials" className="text-pink-500 font-medium hover:underline">Help & Tutorials</a> section for more tips.
        </p>
      </main>
    </div>
  );
}
