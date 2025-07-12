import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
  CheckCircle
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
  other: <Globe className="h-5 w-5 text-gray-500" />
};

const categoryColors = {
  streaming: "bg-blue-50 border-blue-200",
  gaming: "bg-green-50 border-green-200", 
  educational: "bg-purple-50 border-purple-200",
  other: "bg-gray-50 border-gray-200"
};

export default function TeenPasswords() {
  const [, setLocation] = useLocation();
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch shared passwords for teen
  const { data: sharedPasswords = [], isLoading } = useQuery({
    queryKey: ["/api/teen/shared-passwords"],
    retry: false,
  });

  const togglePasswordVisibility = (id: number) => {
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

  const filteredPasswords = sharedPasswords.filter((password: SharedPassword) =>
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
      <TeenNavigation currentPath="/teen-passwords" />
      
      <div className="max-w-4xl mx-auto p-4">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Shared Passwords</h1>
            <p className="text-gray-600">Family accounts shared with you</p>
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
                placeholder="Search by service name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 mb-1">Important Security Reminder</h3>
                <p className="text-sm text-amber-700">
                  These passwords are shared by your parents for family accounts. 
                  Please keep them private and don't share with friends. 
                  If you think a password might be compromised, let your parents know right away.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600">Loading shared passwords...</span>
          </div>
        ) : filteredPasswords.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No passwords found" : "No shared passwords yet"}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {searchTerm 
                  ? "Try searching for a different service or category"
                  : "Your parents haven't shared any passwords with you yet. They can share family account passwords from their settings."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPasswords.map((password: SharedPassword) => (
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
                    <Badge variant="outline">
                      Shared by {password.sharedBy}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Username */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Username/Email</Label>
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

                  {/* Password */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Password</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type={showPasswords[password.id] ? "text" : "password"}
                          value={password.password} 
                          readOnly 
                          className="pr-10 bg-white"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => togglePasswordVisibility(password.id)}
                        >
                          {showPasswords[password.id] ? 
                            <EyeOff className="h-4 w-4" /> : 
                            <Eye className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(password.password, "Password")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  {password.notes && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Notes from Parent</Label>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">{password.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                    <span>Shared {formatDate(password.sharedAt)}</span>
                    {password.lastUsed && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Last used {formatDate(password.lastUsed)}
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
  );
}