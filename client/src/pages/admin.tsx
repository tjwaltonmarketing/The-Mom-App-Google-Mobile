import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Home, TrendingUp, CreditCard, CheckSquare, Calendar,
  Mic, FileText, Utensils, ShoppingCart, Lock, Bell, MessageSquare,
  Star, Share2, ArrowLeft, RefreshCw, UserPlus, Activity, Clock, Filter
} from "lucide-react";
import { authFetch } from "@/lib/queryClient";

interface ActiveTrial {
  id: number;
  user_id: number;
  subscription_plan: string;
  subscription_status: string;
  trial_start_date: string;
  trial_end_date: string;
  created_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface AdminMetrics {
  users: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    recentSignups: Array<{
      id: number;
      email: string;
      first_name: string | null;
      last_name: string | null;
      auth_method: string;
      created_at: string;
    }>;
    signupsByDay: Array<{ signup_date: string; count: number }>;
    authMethods: Array<{ auth_method: string; count: number }>;
  };
  families: {
    total: number;
    totalMembers: number;
    totalTeens: number;
    totalChildren: number;
  };
  subscriptions: Array<{
    subscription_plan: string;
    subscription_status: string;
    count: number;
  }>;
  activeTrials: ActiveTrial[];
  engagement: {
    tasks: { total: number; completed: number };
    events: number;
    voiceNotes: number;
    textNotes: number;
    mealPlans: number;
    groceryItems: number;
    passwords: number;
  };
  pushNotifications: {
    totalTokens: number;
    activeTokens: number;
  };
  feedback: Array<{ count: number; response: string | null; review_requested: number }>;
  featureRequests: Array<{ type: string; status: string; count: number }>;
  referrals: Array<{ platform: string; count: number; bonus_count: number }>;
  satisfaction: Array<{ response: string | null; count: number }>;
  dateFilter: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, color = "text-primary" }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-gray-100 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDaysRemaining(trialEndDate: string): number {
  const end = new Date(trialEndDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function getTrialBadgeColor(daysLeft: number): string {
  if (daysLeft <= 3) return "bg-red-100 text-red-700 border-red-200";
  if (daysLeft <= 7) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

const DATE_FILTERS = [
  { label: "Today", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
  { label: "All Time", days: 0 },
];

export default function Admin() {
  const [, setLocation] = useLocation();
  const [selectedDays, setSelectedDays] = useState(0);

  const { data: adminCheck, isLoading: checkLoading } = useQuery<{ isAdmin: boolean } | null>({
    queryKey: ["/api/admin/check"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/check");
      if (res.status === 401 || res.status === 403) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const { data: metrics, isLoading, refetch, isRefetching } = useQuery<AdminMetrics | null>({
    queryKey: ["/api/admin/metrics", selectedDays],
    queryFn: async () => {
      const url = selectedDays > 0 ? `/api/admin/metrics?days=${selectedDays}` : "/api/admin/metrics";
      const res = await authFetch(url);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!adminCheck?.isAdmin,
    retry: false,
  });

  if (checkLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to view this page.</p>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const taskCompletionRate = metrics.engagement.tasks.total > 0
    ? Math.round((metrics.engagement.tasks.completed / metrics.engagement.tasks.total) * 100)
    : 0;

  const avgFamilySize = metrics.families.total > 0
    ? (metrics.families.totalMembers / metrics.families.total).toFixed(1)
    : "0";

  const getSubCount = (plan: string, status: string) => {
    const match = metrics.subscriptions.find(
      s => s.subscription_plan === plan && s.subscription_status === status
    );
    return Number(match?.count || 0);
  };

  const totalActiveSubs = metrics.subscriptions
    .filter(s => s.subscription_status === "active")
    .reduce((sum, s) => sum + Number(s.count), 0);

  const totalFeedback = metrics.featureRequests.reduce((sum, fr) => sum + Number(fr.count), 0);
  const totalReferrals = metrics.referrals.reduce((sum, r) => sum + Number(r.count), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Admin</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 lg:pb-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Date Range</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((filter) => (
              <Button
                key={filter.days}
                variant={selectedDays === filter.days ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDays(filter.days)}
                className="text-xs"
              >
                {filter.label}
              </Button>
            ))}
          </div>
          {selectedDays > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing data from the last {selectedDays} day{selectedDays !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Users & Growth
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title={selectedDays > 0 ? `Users (${selectedDays}d)` : "Total Users"} value={metrics.users.total} icon={Users} color="text-blue-600" />
            <MetricCard title="New This Week" value={metrics.users.newThisWeek} icon={UserPlus} color="text-green-600" />
            <MetricCard title="New This Month" value={metrics.users.newThisMonth} icon={TrendingUp} color="text-purple-600" />
            <MetricCard title="Auth Methods" value={metrics.users.authMethods.length} subtitle={metrics.users.authMethods.map(a => `${a.auth_method}: ${a.count}`).join(", ")} icon={Activity} color="text-orange-600" />
          </div>
        </section>

        {metrics.users.signupsByDay.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Signups - Last 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {metrics.users.signupsByDay.map((day, i) => {
                    const maxCount = Math.max(...metrics.users.signupsByDay.map(d => Number(d.count)));
                    const height = maxCount > 0 ? (Number(day.count) / maxCount) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{Number(day.count)}</span>
                        <div
                          className="w-full bg-primary/80 rounded-t min-h-[2px]"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${day.signup_date}: ${day.count} signups`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(metrics.users.signupsByDay[0]?.signup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(metrics.users.signupsByDay[metrics.users.signupsByDay.length - 1]?.signup_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {metrics.activeTrials && metrics.activeTrials.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Active Trials
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-1">
                {metrics.activeTrials.length}
              </Badge>
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">User</th>
                        <th className="pb-2 font-medium">Email</th>
                        <th className="pb-2 font-medium">Plan</th>
                        <th className="pb-2 font-medium">Started</th>
                        <th className="pb-2 font-medium">Expires</th>
                        <th className="pb-2 font-medium">Days Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.activeTrials.map((trial) => {
                        const daysLeft = getDaysRemaining(trial.trial_end_date);
                        return (
                          <tr key={trial.id} className="border-b last:border-0">
                            <td className="py-2 font-medium">
                              {trial.first_name} {trial.last_name || ""}
                            </td>
                            <td className="py-2 text-muted-foreground text-xs">{trial.email}</td>
                            <td className="py-2">
                              <Badge variant="outline" className="capitalize text-xs">{trial.subscription_plan}</Badge>
                            </td>
                            <td className="py-2 text-muted-foreground text-xs">
                              {new Date(trial.trial_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="py-2 text-muted-foreground text-xs">
                              {new Date(trial.trial_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="py-2">
                              <Badge variant="outline" className={`text-xs ${getTrialBadgeColor(daysLeft)}`}>
                                {daysLeft > 365 ? "Extended" : `${daysLeft} days`}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Subscriptions & Revenue
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Active Subscriptions" value={totalActiveSubs} icon={CreditCard} color="text-green-600" />
            <MetricCard
              title="Individual Plans"
              value={getSubCount("individual", "active")}
              subtitle="$5.99/mo each"
              icon={Users}
              color="text-blue-600"
            />
            <MetricCard
              title="Family Plans"
              value={getSubCount("family", "active")}
              subtitle="$9.99/mo each"
              icon={Home}
              color="text-purple-600"
            />
            <MetricCard
              title="Est. MRR"
              value={`$${((getSubCount("individual", "active") * 5.99) + (getSubCount("family", "active") * 9.99)).toFixed(2)}`}
              subtitle="Monthly recurring"
              icon={TrendingUp}
              color="text-green-600"
            />
          </div>
          {metrics.subscriptions.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Subscription Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.subscriptions.map((sub, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{sub.subscription_plan}</Badge>
                        <Badge variant={sub.subscription_status === "active" ? "default" : "secondary"} className="capitalize">
                          {sub.subscription_status}
                        </Badge>
                      </div>
                      <span className="font-semibold">{Number(sub.count)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-orange-600" />
            Family Metrics
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Families" value={metrics.families.total} icon={Home} color="text-orange-600" />
            <MetricCard title="Family Members" value={metrics.families.totalMembers} icon={Users} color="text-blue-600" />
            <MetricCard title="Avg Family Size" value={avgFamilySize} icon={Users} color="text-purple-600" />
            <MetricCard title="Teen Accounts" value={metrics.families.totalTeens} subtitle={`+ ${metrics.families.totalChildren} children`} icon={UserPlus} color="text-pink-600" />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Engagement
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Tasks"
              value={metrics.engagement.tasks.total}
              subtitle={`${metrics.engagement.tasks.completed} completed (${taskCompletionRate}%)`}
              icon={CheckSquare}
              color="text-blue-600"
            />
            <MetricCard title="Events" value={metrics.engagement.events} icon={Calendar} color="text-purple-600" />
            <MetricCard title="Voice Notes" value={metrics.engagement.voiceNotes} icon={Mic} color="text-red-500" />
            <MetricCard title="Text Notes" value={metrics.engagement.textNotes} icon={FileText} color="text-gray-600" />
            <MetricCard title="Meal Plans" value={metrics.engagement.mealPlans} icon={Utensils} color="text-green-600" />
            <MetricCard title="Grocery Items" value={metrics.engagement.groceryItems} icon={ShoppingCart} color="text-orange-500" />
            <MetricCard title="Saved Passwords" value={metrics.engagement.passwords} icon={Lock} color="text-gray-700" />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            System Health
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Push Tokens"
              value={metrics.pushNotifications.activeTokens}
              subtitle={`${metrics.pushNotifications.totalTokens} total, ${metrics.pushNotifications.activeTokens} active`}
              icon={Bell}
              color="text-yellow-600"
            />
            <MetricCard title="Total Referrals" value={totalReferrals} subtitle={metrics.referrals.map(r => `${r.platform}: ${r.count}`).join(", ")} icon={Share2} color="text-blue-500" />
            <MetricCard title="Feedback Items" value={totalFeedback} icon={MessageSquare} color="text-green-600" />
          </div>
        </section>

        {metrics.featureRequests.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Feature Requests & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.featureRequests.map((fr, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{fr.type.replace('_', ' ')}</Badge>
                        <Badge variant={fr.status === "pending" ? "secondary" : "default"} className="capitalize">{fr.status}</Badge>
                      </div>
                      <span className="font-semibold">{Number(fr.count)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {metrics.satisfaction.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  User Satisfaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.satisfaction.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <Badge variant="outline" className="capitalize">{s.response || "No response"}</Badge>
                      <span className="font-semibold">{Number(s.count)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Recent Signups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Signed Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.users.recentSignups.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="py-2">{user.first_name} {user.last_name || ""}</td>
                        <td className="py-2 text-muted-foreground">{user.email}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs capitalize">{user.auth_method}</Badge>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
