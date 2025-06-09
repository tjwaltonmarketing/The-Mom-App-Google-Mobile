import { VoiceWakeTest } from "@/components/voice-wake-test";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function VoiceTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
      <div className="container max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Voice Wake-up Test
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Test the "Hey Lisa" voice activation feature
            </p>
          </div>
        </div>

        {/* Voice Test Component */}
        <div className="flex justify-center">
          <VoiceWakeTest />
        </div>

        {/* Instructions */}
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">How to Test</h2>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <p>Toggle "Always listening" to ON</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <p>Allow microphone access when prompted by your browser</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <p>Say "Hey Lisa" followed by a command like "add meeting tomorrow at 2pm"</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                <p>Watch for the wake word detection and command extraction</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Note for Testing</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This is a prototype version that detects "Hey Lisa" and extracts commands. 
                The full version would create actual tasks and calendar events automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}