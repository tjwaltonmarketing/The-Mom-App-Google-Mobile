import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Globe
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [passwords] = useState<PasswordEntry[]>([
    {
      id: 1,
      title: "Netflix",
      category: "streaming",
      website: "netflix.com",
      username: "familyaccount@gmail.com",
      email: "familyaccount@gmail.com",
      password: "SecurePass123!",
      notes: "Family plan - 4 screens",
      isFavorite: true,
      lastUpdated: "2 days ago"
    },
    {
      id: 2,
      title: "School Portal",
      category: "school",
      website: "portal.elementary.edu",
      username: "parent.smith",
      email: "mom@family.com",
      password: "School2024!",
      notes: "Emma & Sam's grades, lunch payments",
      isFavorite: true,
      lastUpdated: "1 week ago"
    },
    {
      id: 3,
      title: "Bank of America",
      category: "banking",
      website: "bankofamerica.com",
      username: "johnsmith123",
      email: "dad@family.com",
      password: "BankSecure456#",
      notes: "Joint checking account",
      isFavorite: false,
      lastUpdated: "3 days ago"
    },
    {
      id: 4,
      title: "Amazon Prime",
      category: "shopping",
      website: "amazon.com",
      username: "familyshop@gmail.com",
      email: "familyshop@gmail.com",
      password: "Amazon789$",
      notes: "Free shipping, video streaming",
      isFavorite: true,
      lastUpdated: "5 days ago"
    },
    {
      id: 5,
      title: "Electric Company",
      category: "utilities",
      website: "powergrid.com",
      username: "account78542",
      email: "mom@family.com",
      password: "Electric2024*",
      notes: "Auto-pay enabled",
      isFavorite: false,
      lastUpdated: "2 weeks ago"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());

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
                         password.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         password.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
                           (selectedCategory === "favorites" && password.isFavorite) ||
                           password.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 blue-light-filter:bg-amber-600 blue-light-filter:hover:bg-amber-700">
            <Plus size={16} className="mr-2" />
            Add Password
          </Button>
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
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 mb-8 bg-gray-100 dark:bg-gray-700 blue-light-filter:bg-amber-100">
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

          <TabsContent value={selectedCategory} className="space-y-3 max-h-96 overflow-y-auto mt-4">
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
                        className="p-1 h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-600"
                        title={password.isFavorite ? "Remove from favorites" : "Add to favorites"}
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
                        Updated {password.lastUpdated}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}