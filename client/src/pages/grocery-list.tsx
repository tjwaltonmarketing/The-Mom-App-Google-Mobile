import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ShoppingCart, Plus, Share2, Calendar, Check, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceNoteModal } from "@/components/voice-note-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GroceryItem, FamilyMember } from "@shared/schema";

export default function GroceryListPage() {
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [newGroceryItem, setNewGroceryItem] = useState({ item: "", quantity: "", category: "" });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Fetch grocery list data from API
  const { data: groceryList = [] } = useQuery<GroceryItem[]>({
    queryKey: ["/api/grocery-items"],
  });

  // Fetch family members for sharing
  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const categories = ['produce', 'meat', 'dairy', 'pantry', 'frozen', 'other'];

  const getPendingGroceries = () => {
    return groceryList.filter((item: GroceryItem) => !item.isCompleted);
  };

  const getCompletedGroceries = () => {
    return groceryList.filter((item: GroceryItem) => item.isCompleted);
  };

  const addGroceryMutation = useMutation({
    mutationFn: async (data: { item: string; quantity: string; category: string }) => {
      return apiRequest("POST", "/api/grocery-items", {
        ...data,
        addedBy: 1, // Current user ID
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      setNewGroceryItem({ item: "", quantity: "", category: "" });
      toast({
        title: "Item added",
        description: "Added to grocery list successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to grocery list",
        variant: "destructive",
      });
    },
  });

  const toggleGroceryMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
      return apiRequest("PATCH", `/api/grocery-items/${id}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
    },
  });

  const deleteGroceryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/grocery-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      toast({
        title: "Item deleted",
        description: "Removed from grocery list",
      });
    },
  });

  const handleAddGroceryItem = () => {
    if (!newGroceryItem.item || !newGroceryItem.quantity) {
      toast({
        title: "Missing information",
        description: "Please enter item name and quantity",
        variant: "destructive",
      });
      return;
    }

    addGroceryMutation.mutate(newGroceryItem);
  };

  const shareGroceryList = async () => {
    if (!selectedMember) {
      toast({
        title: "Select family member",
        description: "Please choose who to share the grocery list with",
        variant: "destructive",
      });
      return;
    }

    const pendingItems = getPendingGroceries();
    if (pendingItems.length === 0) {
      toast({
        title: "Nothing to share",
        description: "No items in your grocery list to share",
        variant: "destructive",
      });
      return;
    }

    try {
      const member = familyMembers.find((m: FamilyMember) => m.id.toString() === selectedMember);
      const itemsList = pendingItems.map((item: GroceryItem) => `${item.item} (${item.quantity})`).join(', ');
      
      await apiRequest("POST", "/api/notifications", {
        type: "grocery_list",
        title: "Grocery List Shared",
        message: `Shopping list: ${itemsList}`,
        recipientId: parseInt(selectedMember),
        deliveryMethod: "in_app"
      });

      toast({
        title: "Grocery list shared",
        description: `Sent shopping list to ${member?.name}`,
      });
      
      setIsShareModalOpen(false);
      setSelectedMember("");
    } catch (error) {
      toast({
        title: "Failed to share",
        description: "Could not send grocery list. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral dark:bg-background blue-light-filter:bg-neutral">
      <Header onStartVoiceNote={() => setIsVoiceModalOpen(true)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="text-pink-500" size={28} />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white blue-light-filter:text-gray-900">
              Grocery List
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 blue-light-filter:text-gray-700">
            Manage your family's shopping list
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Add New Item */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-pink-500" />
                  Add New Item
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input
                    placeholder="Item name"
                    value={newGroceryItem.item}
                    onChange={(e) => setNewGroceryItem({...newGroceryItem, item: e.target.value})}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Quantity"
                      value={newGroceryItem.quantity}
                      onChange={(e) => setNewGroceryItem({...newGroceryItem, quantity: e.target.value})}
                      className="flex-1"
                    />
                    <Select value={newGroceryItem.category} onValueChange={(value) => setNewGroceryItem({...newGroceryItem, category: value})}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddGroceryItem} disabled={addGroceryMutation.isPending} className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-pink-500" />
                    Shopping List ({getPendingGroceries().length} items)
                  </div>
                  <Button variant="outline" onClick={() => setIsShareModalOpen(true)} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getPendingGroceries().map((item: GroceryItem) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-white border rounded-lg">
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => toggleGroceryMutation.mutate({ id: item.id, isCompleted: true })}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.item}</p>
                        <p className="text-sm text-gray-600">{item.quantity}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGroceryMutation.mutate(item.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {getPendingGroceries().length === 0 && (
                    <p className="text-gray-500 text-center py-8">No items in your grocery list yet. Add some items above!</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Completed Items */}
            {getCompletedGroceries().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Completed ({getCompletedGroceries().length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getCompletedGroceries().map((item: GroceryItem) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 border rounded-lg opacity-75">
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => toggleGroceryMutation.mutate({ id: item.id, isCompleted: false })}
                        />
                        <div className="flex-1">
                          <p className="font-medium line-through text-gray-500">{item.item}</p>
                          <p className="text-sm text-gray-400">{item.quantity}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Generate from Meals
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share with Family
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map(category => {
                    const count = getPendingGroceries().filter(item => item.category === category).length;
                    return (
                      <div key={category} className="flex justify-between items-center">
                        <span className="capitalize text-sm">{category}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
      
      {/* Share Grocery List Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Grocery List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Send to:
              </label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose family member" />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member: FamilyMember) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Items to share ({getPendingGroceries().length} items):
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-md p-3">
                {getPendingGroceries().length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {getPendingGroceries().map((item: GroceryItem) => (
                      <li key={item.id} className="flex justify-between">
                        <span>{item.item}</span>
                        <span className="text-gray-500">{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No items to share</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsShareModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={shareGroceryList}
                disabled={!selectedMember || getPendingGroceries().length === 0}
                className="flex-1 gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VoiceNoteModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
      />
    </div>
  );
}