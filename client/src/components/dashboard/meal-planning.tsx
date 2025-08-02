import { useState } from "react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ShoppingCart, Utensils, Calendar, Trash2, Edit, Check, Share2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek } from "date-fns";

interface MealPlan {
  id: number;
  day: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  meal: string;
  ingredients?: string[];
  prepTime?: number;
  notes?: string;
  createdAt: string;
}

interface GroceryItem {
  id: number;
  item: string;
  quantity: string;
  category: string;
  isCompleted: boolean;
  addedBy: number;
  createdAt: string;
}

export function MealPlanning() {
  const [newMeal, setNewMeal] = useState({ day: "", mealType: "", meal: "", ingredients: "", notes: "" });
  const [newGroceryItem, setNewGroceryItem] = useState({ item: "", quantity: "", category: "" });
  const [editingMeal, setEditingMeal] = useState<MealPlan | null>(null);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch real meal plans data from API
  const { data: mealPlans = [], refetch: refetchMeals, isLoading: mealsLoading, error: mealsError } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
    queryFn: async () => {
      console.log("🍽️ Direct fetch to /api/meal-plans");
      const response = await fetch("/api/meal-plans", {
        credentials: "include",
      });
      console.log("🍽️ Response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("🍽️ Fetched meal data:", data);
      return data;
    },
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  console.log("🍽️ Meal plans query state:", { 
    count: mealPlans.length, 
    firstMeal: mealPlans[0],
    allMeals: mealPlans,
    loading: mealsLoading, 
    error: mealsError,
    errorDetails: JSON.stringify(mealsError)
  });

  // Force refresh if no data and not loading
  if (mealPlans.length === 0 && !mealsLoading && !mealsError) {
    console.log("🔄 Force refreshing meal data...");
    refetchMeals();
  }

  // Fetch real grocery list data from API
  const { data: groceryList = [], refetch: refetchGrocery } = useQuery<GroceryItem[]>({
    queryKey: ["/api/grocery-items"],
    queryFn: async () => {
      console.log("🛒 Direct fetch to /api/grocery-items");
      const response = await fetch("/api/grocery-items", {
        credentials: "include",
      });
      console.log("🛒 Response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("🛒 Fetched grocery data:", data);
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Fetch family members for sharing
  const { data: familyMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/family-members"],
  });

  const addMealMutation = useMutation({
    mutationFn: async (meal: Omit<MealPlan, 'id' | 'createdAt'>) => {
      const response = await apiRequest("POST", "/api/meal-plans", {
        ...meal,
        createdBy: 1, // Default to first family member
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      await refetchMeals(); // Force immediate refetch
      toast({
        title: "Meal added",
        description: "Meal has been added to your plan",
      });
      setNewMeal({ day: "", mealType: "", meal: "", ingredients: "", notes: "" });
      setIsMealModalOpen(false);
    },
  });

  const addGroceryMutation = useMutation({
    mutationFn: async (item: Omit<GroceryItem, 'id' | 'createdAt' | 'addedBy' | 'isCompleted'>) => {
      const response = await apiRequest("POST", "/api/grocery-items", {
        ...item,
        addedBy: 1, // Default to first family member
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      await refetchGrocery();
      toast({
        title: "Item added",
        description: "Item has been added to your grocery list",
      });
      setNewGroceryItem({ item: "", quantity: "", category: "" });
    },
  });

  const toggleGroceryMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: number; isCompleted: boolean }) => {
      const response = await apiRequest("PATCH", `/api/grocery-items/${id}`, {
        isCompleted,
      });
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      await refetchGrocery();
      toast({
        title: "Item updated",
        description: "Grocery item status updated",
      });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/meal-plans/${id}`);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      await refetchMeals();
      toast({
        title: "Meal deleted",
        description: "Meal has been removed from your plan",
      });
    },
  });

  const deleteGroceryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/grocery-items/${id}`);
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      await refetchGrocery();
      toast({
        title: "Item deleted",
        description: "Grocery item has been removed",
      });
    },
  });

  const deleteAllGroceryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/grocery-items");
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      await refetchGrocery();
      toast({
        title: "All items deleted",
        description: "Grocery list has been cleared",
      });
    },
  });

  const handleAddMeal = () => {
    if (!newMeal.day || !newMeal.mealType || !newMeal.meal) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addMealMutation.mutate({
      day: newMeal.day,
      mealType: newMeal.mealType as "breakfast" | "lunch" | "dinner" | "snack",
      meal: newMeal.meal,
      notes: newMeal.notes,
      ingredients: newMeal.ingredients ? newMeal.ingredients.split(',').map(i => i.trim()) : undefined,
    });
  };

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

  const generateGroceryFromMeals = async () => {
    const ingredients = mealPlans.flatMap(meal => meal.ingredients || []);
    const uniqueIngredients = Array.from(new Set(ingredients));
    
    if (uniqueIngredients.length === 0) {
      toast({
        title: "No ingredients found",
        description: "No ingredients available in your meal plans",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add each unique ingredient as a grocery item
      const promises = uniqueIngredients.map(ingredient =>
        apiRequest("POST", "/api/grocery-items", {
          item: ingredient,
          quantity: "1", // Default quantity
          category: "pantry", // Default category
          addedBy: 1,
        })
      );

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      await refetchGrocery();

      toast({
        title: "Grocery list updated",
        description: `Added ${uniqueIngredients.length} ingredients from meal plans`,
      });
    } catch (error) {
      toast({
        title: "Failed to generate list",
        description: "Could not add ingredients to grocery list",
        variant: "destructive",
      });
    }
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

    // Create a notification for the selected family member
    try {
      const member = familyMembers.find((m: any) => m.id.toString() === selectedMember);
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

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const categories = ['produce', 'meat', 'dairy', 'pantry', 'frozen', 'other'];

  const getMealsForDay = (day: string) => {
    console.log(`Getting meals for ${day}:`, mealPlans.filter(meal => meal.day === day));
    return mealPlans.filter(meal => meal.day === day);
  };

  const getPendingGroceries = () => {
    return groceryList.filter((item: GroceryItem) => !item.isCompleted);
  };

  const getCompletedGroceries = () => {
    return groceryList.filter((item: GroceryItem) => item.isCompleted);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center">
          <Utensils className="text-primary mr-2 h-5 w-5" />
          Meal Planning & Grocery Lists
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="meals" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meals">Meal Plans</TabsTrigger>
            <TabsTrigger value="grocery">Grocery List</TabsTrigger>
          </TabsList>
          
          <TabsContent value="meals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Weekly Meal Plan</h3>
              <Dialog open={isMealModalOpen} onOpenChange={setIsMealModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Meal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Meal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={newMeal.day} onValueChange={(value) => setNewMeal({...newMeal, day: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekDays.map(day => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={newMeal.mealType} onValueChange={(value) => setNewMeal({...newMeal, mealType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Meal type" />
                      </SelectTrigger>
                      <SelectContent>
                        {mealTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Meal name"
                      value={newMeal.meal}
                      onChange={(e) => setNewMeal({...newMeal, meal: e.target.value})}
                    />

                    <Input
                      placeholder="Ingredients (comma separated)"
                      value={newMeal.ingredients}
                      onChange={(e) => setNewMeal({...newMeal, ingredients: e.target.value})}
                    />

                    <Textarea
                      placeholder="Notes (optional)"
                      value={newMeal.notes}
                      onChange={(e) => setNewMeal({...newMeal, notes: e.target.value})}
                    />

                    <Button onClick={handleAddMeal} className="w-full" disabled={addMealMutation.isPending}>
                      {addMealMutation.isPending ? "Adding..." : "Add Meal"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekDays.map(day => (
                <div key={day} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-center">{day}</h4>
                  <div className="space-y-2">
                    {getMealsForDay(day).length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No meals planned</p>
                    ) : (
                      getMealsForDay(day).map(meal => (
                        <div key={meal.id} className="bg-gray-50 rounded p-3 cursor-pointer hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <Badge variant="outline" className="text-xs">
                              {meal.mealType}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMealMutation.mutate(meal.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>
                            <p className="font-medium text-sm">{meal.meal}</p>
                            {expandedMeal === meal.id ? (
                              <div className="mt-2 space-y-2">
                                {meal.ingredients && meal.ingredients.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Ingredients:</p>
                                    <ul className="text-xs text-gray-600 ml-2">
                                      {meal.ingredients.map((ingredient, index) => (
                                        <li key={index}>• {ingredient}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {meal.notes && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-700">Notes:</p>
                                    <p className="text-xs text-gray-600">{meal.notes}</p>
                                  </div>
                                )}
                                {meal.prepTime && (
                                  <p className="text-xs text-gray-500">
                                    <span className="font-medium">Prep time:</span> {meal.prepTime} min
                                  </p>
                                )}
                              </div>
                            ) : (
                              <>
                                {meal.ingredients && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {meal.ingredients.slice(0, 2).join(', ')}
                                    {meal.ingredients.length > 2 && '...'}
                                  </p>
                                )}
                                {meal.prepTime && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {meal.prepTime} min prep
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="grocery" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Grocery List</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateGroceryFromMeals} className="gap-2">
                  <Calendar className="h-4 w-4" />
                  From Meals
                </Button>
                <Button variant="outline" onClick={() => setIsShareModalOpen(true)} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                {groceryList.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={() => deleteAllGroceryMutation.mutate()} 
                    disabled={deleteAllGroceryMutation.isPending}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-4">
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

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Shopping List ({getPendingGroceries().length} items)
                </h4>
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
                        disabled={deleteGroceryMutation.isPending}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {getPendingGroceries().length === 0 && (
                    <p className="text-gray-500 text-center py-4">All items completed!</p>
                  )}
                </div>
              </div>

              {getCompletedGroceries().length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Completed ({getCompletedGroceries().length} items)
                  </h4>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGroceryMutation.mutate(item.id)}
                          disabled={deleteGroceryMutation.isPending}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

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
                  {familyMembers.map((member: any) => (
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
                <Send className="h-4 w-4" />
                Share List
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}