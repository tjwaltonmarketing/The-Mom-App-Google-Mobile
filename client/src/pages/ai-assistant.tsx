import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AIAssistant } from "@/components/ai-assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Lightbulb, Zap, Clock, Shield } from "lucide-react";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";

export default function AIAssistantPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 lg:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="text-white" size={20} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
              AI Assistant & Support
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Your intelligent family coordinator and app support specialist
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <AIAssistant />
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="text-yellow-500" size={20} />
                  What I Can Help With
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Zap className="text-blue-500 mt-1" size={16} />
                    <div>
                      <h4 className="font-medium text-sm">Family Coordination</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        "Remind Emma to practice piano at 4 PM tomorrow"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="text-green-500 mt-1" size={16} />
                    <div>
                      <h4 className="font-medium text-sm">Meal Planning</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        "Give me 5 easy dinner ideas for this week"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Bot className="text-purple-500 mt-1" size={16} />
                    <div>
                      <h4 className="font-medium text-sm">Grocery List</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        "Add milk, bread, and eggs to my shopping list"
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hidden lg:block">
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 blue-light-filter:bg-blue-25 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 blue-light-filter:text-blue-800">
                    Use family member names for automatic task assignment
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-900/20 blue-light-filter:bg-green-25 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 blue-light-filter:text-green-800">
                    Ask specific questions about app features for detailed help
                  </p>
                </div>
                
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 blue-light-filter:bg-purple-25 rounded-lg">
                  <p className="text-sm text-purple-800 dark:text-purple-200 blue-light-filter:text-purple-800">
                    Include context for troubleshooting issues effectively
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="text-blue-500" size={20} />
                  AI Data & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This assistant is powered by <strong>OpenAI</strong>. When you send a message, the following data may be sent to OpenAI for processing:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-4">
                  <li>Your message text</li>
                  <li>Family member names (for task assignment)</li>
                  <li>Voice note transcriptions</li>
                </ul>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  OpenAI does not use your data to train their models. Your conversations are not stored by OpenAI beyond processing your request.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  See our <a href="/privacy" className="text-primary underline">Privacy Policy</a> for full details.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}