import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, ShoppingCart, Utensils, Calendar, Trash2, Edit, Check } from "lucide-react";
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
  const { toast } = useToast();

  // Mock data for meal plans (replace with actual API calls)
  const mealPlans: MealPlan[] = [
    {
      id: 1,
      day: "Monday",
      mealType: "breakfast",
      meal: "Oatmeal with berries",
      ingredients: ["Oats", "Blueberries", "Milk", "Honey"],
      prepTime: 10,
      notes: "Kids love this!",
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      day: "Monday",
      mealType: "dinner",
      meal: "Grilled chicken with vegetables",
      ingredients: ["Chicken breast", "Broccoli", "Carrots", "Olive oil"],
      prepTime: 30,
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      day: "Tuesday",
      mealType: "lunch",
      meal: "Turkey sandwiches",
      ingredients: ["Turkey", "Bread", "Lettuce", "Tomato", "Mayo"],
      prepTime: 5,
      createdAt: new Date().toISOString(),
    },
  ];

  // Fetch real grocery list data from API
  const { data: groceryList = [] } = useQuery<GroceryItem[]>({
    queryKey: ["/api/grocery-items"],
  });

  const addMealMutation = useMutation({
    mutationFn: async (meal: Omit<MealPlan, 'id' | 'createdAt'>) => {
      // Replace with actual API call
      return Promise.resolve({ ...meal, id: Date.now(), createdAt: new Date().toISOString() });
    },
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
      toast({
        title: "Item updated",
        description: "Grocery item status updated",
      });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      // Replace with actual API call
      return Promise.resolve(id);
    },
    onSuccess: () => {
      toast({
        title: "Meal removed",
        description: "Meal has been removed from your plan",
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

  const generateGroceryFromMeals = () => {
    const ingredients = mealPlans.flatMap(meal => meal.ingredients || []);
    const uniqueIngredients = Array.from(new Set(ingredients));
    
    toast({
      title: "Grocery list generated",
      description: `Added ${uniqueIngredients.length} items from meal plans`,
    });
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const categories = ['produce', 'meat', 'dairy', 'pantry', 'frozen', 'other'];

  const getMealsForDay = (day: string) => {
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
                        <div key={meal.id} className="bg-gray-50 rounded p-3">
                          <div className="flex justify-between items-start mb-1">
                            <Badge variant="outline" className="text-xs">
                              {meal.mealType}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => deleteMealMutation.mutate(meal.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-medium text-sm">{meal.meal}</p>
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
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Item name"
                value={newGroceryItem.item}
                onChange={(e) => setNewGroceryItem({...newGroceryItem, item: e.target.value})}
              />
              <Input
                placeholder="Quantity"
                value={newGroceryItem.quantity}
                onChange={(e) => setNewGroceryItem({...newGroceryItem, quantity: e.target.value})}
                className="w-32"
              />
              <Select value={newGroceryItem.category} onValueChange={(value) => setNewGroceryItem({...newGroceryItem, category: value})}>
                <SelectTrigger className="w-32">
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
              <Button onClick={handleAddGroceryItem} disabled={addGroceryMutation.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}