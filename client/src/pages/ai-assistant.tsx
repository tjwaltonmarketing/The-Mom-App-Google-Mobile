import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AIAssistant } from "@/components/ai-assistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Lightbulb, Zap, Clock, Shield, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { hasAIConsent, grantAIConsent } from "@/lib/ai-consent";

export default function AIAssistantPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consented, setConsented] = useState(hasAIConsent());

  useEffect(() => {
    if (!hasAIConsent()) {
      setShowConsentDialog(true);
    }
  }, []);

  const handleConsent = () => {
    grantAIConsent();
    setConsented(true);
    setShowConsentDialog(false);
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />

      <AlertDialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="text-blue-500" size={20} />
              AI Data & Privacy Consent
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  The AI Assistant is powered by <strong className="text-gray-900 dark:text-gray-200">OpenAI</strong>, a third-party AI service. When you use this feature, the following personal data may be sent to OpenAI for processing:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Messages you type in the AI chat</li>
                  <li>Voice note transcriptions</li>
                  <li>Family member names (for task assignment context)</li>
                </ul>
                <p>
                  OpenAI processes your data solely to generate responses. Your data is <strong className="text-gray-900 dark:text-gray-200">not used to train AI models</strong> and is <strong className="text-gray-900 dark:text-gray-200">not stored</strong> beyond processing your request.
                </p>
                <p>
                  See our <a href="/privacy" className="text-primary underline">Privacy Policy</a> for full details.
                </p>
                <p className="font-medium text-gray-900 dark:text-gray-200">
                  Do you consent to sharing your data with OpenAI to use the AI Assistant?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleConsent} className="bg-primary w-full">
              Yes, I agree
            </Button>
            <Button variant="outline" onClick={() => setShowConsentDialog(false)} className="w-full">
              No, go back
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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

        {!consented ? (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="mx-auto text-amber-500" size={32} />
              <h3 className="font-semibold text-lg">AI Data Consent Required</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To use the AI Assistant, you need to consent to sharing data with OpenAI, our third-party AI provider.
              </p>
              <Button onClick={() => setShowConsentDialog(true)}>
                Review & Accept
              </Button>
            </CardContent>
          </Card>
        ) : (
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

          </div>
        </div>
        )}
      </main>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}