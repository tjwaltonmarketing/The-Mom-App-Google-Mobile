import { useState, useCallback, useMemo, useEffect, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Lock,
  Unlock,
  Shield,
  Tv,
  Music,
  GamepadIcon,
  Globe,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  User
} from "lucide-react";
import TeenNavigation from "@/components/teen/teen-navigation";

interface SharedPassword {
  id: number;
  service: string;
  category: "streaming" | "gaming" | "educational" | "other";
  username: string;
  password: string;
  notes?: string;
  sharedBy: string;
  sharedAt: Date;
  lastUsed?: Date;
}

const categoryIcons = {
  streaming: <Tv className="h-5 w-5 text-blue-500" />,
  gaming: <GamepadIcon className="h-5 w-5 text-green-500" />,
  educational: <Shield className="h-5 w-5 text-purple-500" />,
  social: <User className="h-5 w-5 text-pink-500" />,
  school: <Shield className="h-5 w-5 text-indigo-500" />,
  other: <Globe className="h-5 w-5 text-gray-500" />
};

const categoryColors = {
  streaming: "bg-blue-50 border-blue-200",
  gaming: "bg-green-50 border-green-200", 
  educational: "bg-purple-50 border-purple-200",
  social: "bg-pink-50 border-pink-200",
  school: "bg-indigo-50 border-indigo-200",
  other: "bg-gray-50 border-gray-200"
};

export default function TeenPasswords() {
  const [, setLocation] = useLocation();
  const [showPasswords, setShowPasswords] = useState<Record<string | number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Invalidate only password-related caches on mount to force fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/teen/shared-passwords"] });
    console.log("Invalidated password caches on teen passwords page load");
  }, [queryClient]);

  // Get teen profile data
  const { data: authData } = useQuery({
    queryKey: ["/api/teen/auth/user"],
    retry: false,
  });
  
  const teenProfile = (authData as any)?.teenProfile;

  // Fetch shared passwords for teen
  const { data: sharedPasswords = [], isLoading: isLoadingShared } = useQuery({
    queryKey: ["/api/teen/shared-passwords"],
    retry: false,
  });

  const togglePasswordVisibility = (id: number | string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const filteredSharedPasswords = (sharedPasswords as SharedPassword[]).filter((password: SharedPassword) =>
    password.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    password.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <TeenNavigation currentPath="/teen-passwords" teenProfile={teenProfile} />
      
      <div className="max-w-4xl mx-auto p-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Family Passwords</h1>
            <p className="text-gray-600">Access shared family passwords</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secure
          </Badge>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Label htmlFor="search" className="sr-only">Search passwords</Label>
              <Input
                id="search"
                placeholder="Search passwords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Shared Passwords */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-semibold">
              Family Shared Passwords ({filteredSharedPasswords.length})
            </h2>
          </div>

          {isLoadingShared ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-gray-600">Loading shared passwords...</span>
            </div>
          ) : filteredSharedPasswords.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No passwords found" : "No shared passwords yet"}
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-4">
                  {searchTerm 
                    ? "Try searching for a different service or category"
                    : "Your parents haven't shared any passwords with the family yet."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSharedPasswords.map((password: SharedPassword) => (
                <Card key={password.id} className={`${categoryColors[password.category]} transition-all hover:shadow-md`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {categoryIcons[password.category]}
                        <div>
                          <CardTitle className="text-lg">{password.service}</CardTitle>
                          <p className="text-sm text-gray-600 capitalize">{password.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Shared by {password.sharedBy}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Username</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={password.username} 
                          readOnly 
                          className="flex-1 bg-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(password.username, "Username")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Password</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type={showPasswords[password.id] ? "text" : "password"}
                          value={password.password} 
                          readOnly 
                          className="flex-1 bg-white"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePasswordVisibility(password.id)}
                        >
                          {showPasswords[password.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(password.password, "Password")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {password.notes && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Notes</Label>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          {password.notes}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Shared: {formatDate(password.sharedAt)}
                      {password.lastUsed && (
                        <span className="ml-4">
                          Last used: {formatDate(password.lastUsed)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}