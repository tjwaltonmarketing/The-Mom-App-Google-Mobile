import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PasswordModal } from "@/components/password-modal";
import { PasswordEditModal } from "@/components/password-edit-modal";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Plus, 
  Search, 
  Eye, 
  EyeOff, 
  Copy, 
  Star,
  StarOff,
  ExternalLink,
  Lock,
  Mail,
  User,
  Globe,
  Edit,
  Trash2,
  AlertTriangle,
  Crown
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import type { Password } from "@shared/schema";
import { useSubscription } from "@/hooks/use-subscription";
import { Link } from "wouter";

interface PasswordEntry {
  id: number;
  title: string;
  category: string;
  website?: string;
  username?: string;
  email?: string;
  password: string;
  notes?: string;
  isFavorite: boolean;
  lastUpdated: string;
}

export function PasswordVault() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isIndividualPlan, canAccessPasswordVault, canSharePasswords } = useSubscription();
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState<Password | null>(null);
  const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false);

  const { data: passwords = [], isLoading, error } = useQuery<Password[]>({
    queryKey: ['/api/passwords'],
  });

  // Individual password deletion
  const deletePasswordMutation = useMutation({
    mutationFn: async (passwordId: number) => {
      return apiRequest("DELETE", `/api/passwords/${passwordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passwords"] });
      toast({
        title: "Password Deleted",
        description: "Password has been successfully deleted.",
      });
      setDeleteConfirmPassword(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete password. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Remove all passwords deletion
  const removeAllPasswordsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/passwords");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passwords"] });
      toast({
        title: "All Passwords Removed",
        description: "All your passwords have been successfully deleted.",
      });
      setShowRemoveAllConfirm(false);
    },
    onError: () => {
      toast({
        title: "Remove All Failed",
        description: "Failed to remove all passwords. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ passwordId, isFavorite }: { passwordId: number; isFavorite: boolean }) => {
      return apiRequest("PATCH", `/api/passwords/${passwordId}/favorite`, { isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passwords"] });
      toast({
        title: "Favorite Updated",
        description: "Password favorite status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());

  const handleDeletePassword = (password: Password) => {
    setDeleteConfirmPassword(password);
  };

  const handleRemoveAll = () => {
    if (passwords.length > 0) {
      setShowRemoveAllConfirm(true);
    }
  };

  const handleToggleFavorite = (password: Password) => {
    toggleFavoriteMutation.mutate({
      passwordId: password.id,
      isFavorite: !password.isFavorite
    });
  };

  const categories = [
    { id: "all", label: "All", count: passwords.length },
    { id: "favorites", label: "Favorites", count: passwords.filter(p => p.isFavorite).length },
    { id: "streaming", label: "Streaming", count: passwords.filter(p => p.category === "streaming").length },
    { id: "banking", label: "Banking", count: passwords.filter(p => p.category === "banking").length },
    { id: "school", label: "School", count: passwords.filter(p => p.category === "school").length },
    { id: "shopping", label: "Shopping", count: passwords.filter(p => p.category === "shopping").length },
    { id: "utilities", label: "Utilities", count: passwords.filter(p => p.category === "utilities").length }
  ];

  const filteredPasswords = passwords.filter(password => {
    const matchesSearch = password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (password.website || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (password.username || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
                           (selectedCategory === "favorites" && password.isFavorite) ||
                           password.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 blue-light-filter:bg-amber-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600 dark:text-blue-400 blue-light-filter:text-amber-600" size={20} />
            <CardTitle className="text-lg">Password Vault</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lock size={32} className="mx-auto mb-3 opacity-50" />
            <p>Loading passwords...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const is401 = error.message?.includes('401');
    return (
      <Card className="bg-white dark:bg-gray-800 blue-light-filter:bg-amber-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600 dark:text-blue-400 blue-light-filter:text-amber-600" size={20} />
            <CardTitle className="text-lg">Password Vault</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <Lock size={32} className="mx-auto mb-3 opacity-50" />
            <p>{is401 ? "Session expired — please log out and log back in" : "Failed to load passwords"}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/passwords'] })}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const togglePasswordVisibility = (id: number) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "streaming": return "🎬";
      case "banking": return "🏦";
      case "school": return "📚";
      case "shopping": return "🛒";
      case "utilities": return "⚡";
      default: return "🔐";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "streaming": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "banking": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "school": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "shopping": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "utilities": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 blue-light-filter:bg-amber-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-600 dark:text-blue-400 blue-light-filter:text-amber-600" size={20} />
            <CardTitle className="text-lg">Password Vault</CardTitle>
          </div>
          <div className="flex gap-2">
            {passwords.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveAll}
                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                data-testid="button-remove-all-passwords"
              >
                <Trash2 size={16} className="mr-2" />
                Remove All
              </Button>
            )}
            <PasswordModal onPasswordAdded={() => queryClient.invalidateQueries({ queryKey: ["/api/passwords"] })} />
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search passwords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 mb-4 bg-gray-100 dark:bg-gray-700 blue-light-filter:bg-amber-100 h-auto flex-wrap">
            {categories.map(category => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="text-xs flex flex-col gap-1 p-2 bg-white dark:bg-gray-800 blue-light-filter:bg-amber-50 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900 blue-light-filter:data-[state=active]:bg-amber-200"
              >
                <span>{category.label}</span>
                <Badge variant="secondary" className="text-xs bg-gray-200 dark:bg-gray-600 blue-light-filter:bg-amber-200">
                  {category.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-3 max-h-96 overflow-y-auto">
            {filteredPasswords.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Lock size={32} className="mx-auto mb-3 opacity-50" />
                <p>No passwords found</p>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            ) : (
              filteredPasswords.map((password) => (
                <div
                  key={password.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 blue-light-filter:bg-amber-25 rounded-lg border border-gray-200 dark:border-gray-600 blue-light-filter:border-amber-200"
                >
                  <div className="flex items-start mb-3">
                    <div className="flex items-center gap-2 flex-1 mr-3">
                      <div className="w-3 h-3 text-xs flex items-center justify-center flex-shrink-0">
                        {getCategoryIcon(password.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white blue-light-filter:text-gray-900 truncate">
                            {password.title}
                          </h3>
                          {password.isFavorite && (
                            <Star size={12} className="text-yellow-500 fill-current flex-shrink-0" />
                          )}
                        </div>
                        <Badge className={`text-xs ${getCategoryColor(password.category)}`}>
                          {password.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                      {password.website && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://${password.website}`, '_blank')}
                          className="p-1 h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-600"
                          title="Open website"
                        >
                          <ExternalLink size={10} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(password)}
                        className="p-1 h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-600"
                        title={password.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        disabled={toggleFavoriteMutation.isPending}
                        data-testid={`button-toggle-favorite-${password.id}`}
                      >
                        {password.isFavorite ? <StarOff size={10} /> : <Star size={10} />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {password.website && (
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-700">
                          {password.website}
                        </span>
                      </div>
                    )}
                    
                    {password.username && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User size={14} className="text-gray-500 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-700 truncate">
                            {password.username}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(password.username || "")}
                          className="p-1 h-6 w-6 flex-shrink-0"
                          title="Copy username"
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    )}

                    {password.email && password.email !== password.username && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Mail size={14} className="text-gray-500 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-700 truncate">
                            {password.email}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(password.email || "")}
                          className="p-1 h-6 w-6 flex-shrink-0"
                          title="Copy email"
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Lock size={14} className="text-gray-500 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300 blue-light-filter:text-gray-700 font-mono truncate">
                          {visiblePasswords.has(password.id) 
                            ? password.password 
                            : "•".repeat(password.password.length)
                          }
                        </span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility(password.id)}
                          className="p-1 h-6 w-6"
                          title={visiblePasswords.has(password.id) ? "Hide password" : "Show password"}
                        >
                          {visiblePasswords.has(password.id) ? (
                            <EyeOff size={12} />
                          ) : (
                            <Eye size={12} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(password.password)}
                          className="p-1 h-6 w-6"
                          title="Copy password"
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </div>

                    {password.notes && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 blue-light-filter:text-gray-600">
                          {password.notes}
                        </p>
                      </>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-gray-400">
                        Updated {password.lastUpdated ? new Date(password.lastUpdated).toLocaleDateString() : 'Never'}
                      </span>
                      <div className="flex gap-1">
                        {canSharePasswords && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingPassword(password)}
                            className="p-1 h-6 w-6 text-gray-400 hover:text-blue-600"
                            title="Edit sharing permissions"
                            data-testid={`button-edit-password-${password.id}`}
                          >
                            <Edit size={12} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePassword(password)}
                          className="p-1 h-6 w-6 text-gray-400 hover:text-red-600"
                          title="Delete password"
                          data-testid={`button-delete-password-${password.id}`}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {editingPassword && (
        <PasswordEditModal 
          password={editingPassword}
          isOpen={!!editingPassword}
          onClose={() => setEditingPassword(null)}
        />
      )}
      
      {/* Individual Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmPassword} onOpenChange={() => setDeleteConfirmPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              Delete Password
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the password for "{deleteConfirmPassword?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmPassword && deletePasswordMutation.mutate(deleteConfirmPassword.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletePasswordMutation.isPending}
            >
              {deletePasswordMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Remove All Confirmation */}
      <AlertDialog open={showRemoveAllConfirm} onOpenChange={setShowRemoveAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              Remove All Passwords
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL {passwords.length} passwords? This will permanently remove all your saved passwords and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeAllPasswordsMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={removeAllPasswordsMutation.isPending}
            >
              {removeAllPasswordsMutation.isPending ? "Removing All..." : "Remove All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}