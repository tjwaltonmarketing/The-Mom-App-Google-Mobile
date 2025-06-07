import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Calendar, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { Button } from "@/components/ui/button";

export default function MealPlanPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      <MobileNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="text-primary" size={28} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
              Meal Planning
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Plan weekly meals and generate shopping lists
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  This Week's Menu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 blue-light-filter:bg-green-25 rounded-lg border border-green-200 dark:border-green-800 blue-light-filter:border-green-200">
                    <h4 className="font-medium text-green-800 dark:text-green-200 blue-light-filter:text-green-800 mb-2">Monday</h4>
                    <p className="text-sm text-green-700 dark:text-green-300 blue-light-filter:text-green-700">Spaghetti & Meatballs</p>
                    <p className="text-xs text-green-600 dark:text-green-400 blue-light-filter:text-green-600">Kids love it, easy cleanup</p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 blue-light-filter:bg-blue-25 rounded-lg border border-blue-200 dark:border-blue-800 blue-light-filter:border-blue-200">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 blue-light-filter:text-blue-800 mb-2">Tuesday</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 blue-light-filter:text-blue-700">Taco Tuesday</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 blue-light-filter:text-blue-600">Family tradition night</p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 blue-light-filter:bg-purple-25 rounded-lg border border-purple-200 dark:border-purple-800 blue-light-filter:border-purple-200">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200 blue-light-filter:text-purple-800 mb-2">Wednesday</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 blue-light-filter:text-purple-700">Chicken Stir Fry</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 blue-light-filter:text-purple-600">Quick & healthy</p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 blue-light-filter:bg-orange-25 rounded-lg border border-orange-200 dark:border-orange-800 blue-light-filter:border-orange-200">
                    <h4 className="font-medium text-orange-800 dark:text-orange-200 blue-light-filter:text-orange-800 mb-2">Thursday</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300 blue-light-filter:text-orange-700">Pizza Night</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 blue-light-filter:text-orange-600">Order or homemade</p>
                  </div>
                </div>
                
                <div className="mt-6 text-center py-8 text-gray-500 dark:text-gray-400">
                  <ChefHat size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Advanced meal planning features coming soon</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Shopping List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 blue-light-filter:bg-amber-25 rounded">
                    <span className="text-sm">Ground beef (2 lbs)</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 blue-light-filter:bg-amber-25 rounded">
                    <span className="text-sm">Spaghetti pasta</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 blue-light-filter:bg-amber-25 rounded">
                    <span className="text-sm">Taco shells</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 blue-light-filter:bg-amber-25 rounded">
                    <span className="text-sm">Bell peppers</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>
                
                <Button className="w-full mt-4" variant="outline">
                  Add to List
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <ChefHat size={16} className="mr-2" />
                  Browse Recipes
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar size={16} className="mr-2" />
                  Plan Next Week
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ShoppingCart size={16} className="mr-2" />
                  Send List to Store
                </Button>
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