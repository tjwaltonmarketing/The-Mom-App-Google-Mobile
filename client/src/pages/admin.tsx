import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Home, TrendingUp, CreditCard, CheckSquare, Calendar,
  Mic, FileText, Utensils, ShoppingCart, Lock, Bell, MessageSquare,
  Star, Share2, ArrowLeft, RefreshCw, UserPlus, Activity, Clock,
  Filter, BarChart2, ChevronRight, AlertCircle
} from "lucide-react";
import { authFetch } from "@/lib/queryClient";

interface ActiveTrial {
  id: number; user_id: number; subscription_plan: string;
  subscription_status: string; trial_start_date: string;
  trial_end_date: string; created_at: string;
  email: string; first_name: string | null; last_name: string | null;
}

interface AdminMetrics {
  users: {
    total: number; newThisWeek: number; newThisMonth: number;
    recentSignups: Array<{ id: number; email: string; first_name: string | null; last_name: string | null; auth_method: string; created_at: string }>;
    signupsByDay: Array<{ signup_date: string; count: number }>;
    authMethods: Array<{ auth_method: string; count: number }>;
  };
  families: { total: number; totalMembers: number; totalTeens: number; totalChildren: number };
  subscriptions: Array<{ subscription_plan: string; subscription_status: string; count: number }>;
  activeTrials: ActiveTrial[];
  engagement: {
    tasks: { total: number; completed: number };
    events: number; voiceNotes: number; textNotes: number;
    mealPlans: number; groceryItems: number; passwords: number;
  };
  pushNotifications: { totalTokens: number; activeTokens: number };
  feedback: Array<{ count: number; response: string | null; review_requested: number }>;
  featureRequests: Array<{ type: string; status: string; count: number }>;
  referrals: Array<{ platform: string; count: number; bonus_count: number }>;
  satisfaction: Array<{ response: string | null; count: number }>;
  dateFilter: string;
}

interface FunnelData {
  stages: Array<{ label: string; count: number; pct: number }>;
  dropOff: number;
  dailyChart: Array<{ date: string; registered: number; trial_started: number }>;
  dateFilter: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, color = "text-primary" }: {
  title: string; value: string | number; subtitle?: string; icon: any; color?: string;
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
  return Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

function getTrialBadgeColor(daysLeft: number): string {
  if (daysLeft <= 3) return "bg-red-100 text-red-700 border-red-200";
  if (daysLeft <= 7) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

const DATE_FILTERS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 0 },
];

const TABS = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "funnel", label: "Funnel", icon: BarChart2 },
  { id: "users", label: "Users", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "engagement", label: "Engagement", icon: Activity },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
];

const STAGE_COLORS = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-red-400"];
const STAGE_BG = ["bg-blue-50", "bg-purple-50", "bg-green-50", "bg-red-50"];
const STAGE_TEXT = ["text-blue-700", "text-purple-700", "text-green-700", "text-red-700"];
const STAGE_BORDER = ["border-blue-200", "border-purple-200", "border-green-200", "border-red-200"];

export default function Admin() {
  const [, setLocation] = useLocation();
  const [selectedDays, setSelectedDays] = useState(30);
  const [activeTab, setActiveTab] = useState("overview");

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

  const { data: funnel, isLoading: funnelLoading } = useQuery<FunnelData | null>({
    queryKey: ["/api/admin/funnel", selectedDays],
    queryFn: async () => {
      const url = selectedDays > 0 ? `/api/admin/funnel?days=${selectedDays}` : "/api/admin/funnel";
      const res = await authFetch(url);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!adminCheck?.isAdmin,
    retry: false,
  });

  if (checkLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-muted-foreground">Checking access...</p></div>;
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

  const getSubCount = (plan: string, status: string) =>
    Number(metrics?.subscriptions.find(s => s.subscription_plan === plan && s.subscription_status === status)?.count || 0);

  const totalActiveSubs = metrics?.subscriptions.filter(s => s.subscription_status === "active").reduce((sum, s) => sum + Number(s.count), 0) || 0;
  const taskCompletionRate = metrics && metrics.engagement.tasks.total > 0
    ? Math.round((metrics.engagement.tasks.completed / metrics.engagement.tasks.total) * 100) : 0;
  const estMRR = ((getSubCount("individual", "active") * 5.99) + (getSubCount("family", "active") * 9.99)).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-bold text-gray-900">Admin</h1>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Admin</Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Date filter */}
              <div className="flex gap-1">
                {DATE_FILTERS.map((f) => (
                  <button
                    key={f.days}
                    onClick={() => setSelectedDays(f.days)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      selectedDays === f.days
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} className="h-8">
                <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex gap-0 border-t overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {(isLoading || funnelLoading) && (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        )}

        {!isLoading && metrics && (
          <>
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Total Users" value={metrics.users.total} icon={Users} color="text-blue-600" />
                  <MetricCard title="New This Month" value={metrics.users.newThisMonth} icon={UserPlus} color="text-green-600" />
                  <MetricCard title="Active Subs" value={totalActiveSubs} icon={CreditCard} color="text-purple-600" />
                  <MetricCard title="Est. MRR" value={`$${estMRR}`} icon={TrendingUp} color="text-green-700" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Families" value={metrics.families.total} icon={Home} color="text-orange-600" />
                  <MetricCard title="Active Trials" value={metrics.activeTrials?.length || 0} icon={Clock} color="text-amber-600" />
                  <MetricCard title="Tasks Created" value={metrics.engagement.tasks.total} subtitle={`${taskCompletionRate}% completed`} icon={CheckSquare} color="text-indigo-600" />
                  <MetricCard title="Push Tokens" value={metrics.pushNotifications.activeTokens} subtitle="active devices" icon={Bell} color="text-yellow-600" />
                </div>

                {/* Mini funnel on overview */}
                {funnel && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-primary" />
                        Conversion Funnel Snapshot
                        <button onClick={() => setActiveTab("funnel")} className="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
                          View full funnel <ChevronRight className="h-3 w-3" />
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-3">
                        {funnel.stages.map((stage, i) => (
                          <div key={i} className="flex-1 text-center">
                            <div className="text-lg font-bold">{stage.count}</div>
                            <div className="text-xs text-muted-foreground mb-1">{stage.label}</div>
                            <div className={`rounded-t h-2 ${STAGE_COLORS[i]}`} style={{ opacity: stage.pct / 100 + 0.2 }} />
                            <div className="text-xs font-medium text-muted-foreground mt-1">
                              {i === 0 ? "base" : `${stage.pct}%`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Signups chart */}
                {metrics.users.signupsByDay.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Signups — Last 30 Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-1 h-28">
                        {metrics.users.signupsByDay.map((day, i) => {
                          const max = Math.max(...metrics.users.signupsByDay.map(d => Number(d.count)));
                          const h = max > 0 ? (Number(day.count) / max) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              {Number(day.count) > 0 && <span className="text-[9px] text-muted-foreground">{day.count}</span>}
                              <div className="w-full bg-primary/70 rounded-t min-h-[2px]" style={{ height: `${Math.max(h, 2)}%` }} title={`${day.signup_date}: ${day.count}`} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{new Date(metrics.users.signupsByDay[0]?.signup_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(metrics.users.signupsByDay[metrics.users.signupsByDay.length - 1]?.signup_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* FUNNEL */}
            {activeTab === "funnel" && funnel && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold mb-1">Conversion Funnel</h2>
                  <p className="text-sm text-muted-foreground">
                    Showing users who registered in the last {selectedDays === 0 ? "all time" : `${selectedDays} days`} and where they dropped off.
                  </p>
                </div>

                {/* Funnel stages */}
                <div className="space-y-3">
                  {funnel.stages.map((stage, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${STAGE_BG[i]} ${STAGE_BORDER[i]}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full ${STAGE_COLORS[i]} flex items-center justify-center text-white text-xs font-bold`}>{i + 1}</div>
                          <span className={`font-semibold text-sm ${STAGE_TEXT[i]}`}>{stage.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gray-900">{stage.count}</span>
                          <span className={`text-sm font-medium ml-2 ${STAGE_TEXT[i]}`}>
                            {i === 0 ? "100%" : `${stage.pct}% of prev`}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${STAGE_COLORS[i]} transition-all`}
                          style={{ width: `${stage.pct}%` }}
                        />
                      </div>
                      {i > 0 && i < funnel.stages.length && (
                        <p className="text-xs text-gray-500 mt-1">
                          {funnel.stages[i - 1].count - stage.count > 0
                            ? `↓ ${funnel.stages[i - 1].count - stage.count} dropped off (${100 - stage.pct}%)`
                            : "No drop-off"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-sm text-muted-foreground">Onboarding Rate</p>
                      <p className="text-3xl font-bold text-purple-600 mt-1">{funnel.stages[1]?.pct ?? 0}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Registered → Trial Started</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-sm text-muted-foreground">Trial Conversion</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">{funnel.stages[2]?.pct ?? 0}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Trial → Paid</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-sm text-muted-foreground">Churn Rate</p>
                      <p className="text-3xl font-bold text-red-500 mt-1">{funnel.stages[3]?.pct ?? 0}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Trial expired without paying</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-sm text-muted-foreground">Pre-Onboarding Drop-off</p>
                      <p className="text-3xl font-bold text-orange-500 mt-1">{funnel.dropOff}</p>
                      <p className="text-xs text-muted-foreground mt-1">Registered but no trial</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily funnel chart */}
                {funnel.dailyChart.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Daily Registrations vs Trial Starts — Last 30 Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-1 h-32">
                        {funnel.dailyChart.map((day, i) => {
                          const max = Math.max(...funnel.dailyChart.map(d => Number(d.registered)));
                          const hReg = max > 0 ? (Number(day.registered) / max) * 100 : 0;
                          const hTrial = max > 0 ? (Number(day.trial_started) / max) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-px" title={`${day.date}\nRegistered: ${day.registered}\nTrial: ${day.trial_started}`}>
                              <div className="w-full flex gap-px items-end" style={{ height: "100%" }}>
                                <div className="flex-1 bg-blue-400 rounded-t min-h-[2px]" style={{ height: `${Math.max(hReg, 2)}%` }} />
                                <div className="flex-1 bg-purple-400 rounded-t min-h-[1px]" style={{ height: `${Math.max(hTrial, 1)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-blue-400" /> Registered</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-purple-400" /> Trial Started</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* USERS */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Total Users" value={metrics.users.total} icon={Users} color="text-blue-600" />
                  <MetricCard title="New This Week" value={metrics.users.newThisWeek} icon={UserPlus} color="text-green-600" />
                  <MetricCard title="New This Month" value={metrics.users.newThisMonth} icon={TrendingUp} color="text-purple-600" />
                  <MetricCard title="Sign-up Methods" value={metrics.users.authMethods.length} subtitle={metrics.users.authMethods.map(a => `${a.auth_method}: ${a.count}`).join(" · ")} icon={Activity} color="text-orange-600" />
                </div>

                {/* Auth method breakdown */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Sign-up Method Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.users.authMethods.map((m, i) => {
                        const pct = metrics.users.total > 0 ? Math.round((Number(m.count) / metrics.users.total) * 100) : 0;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="capitalize font-medium">{m.auth_method}</span>
                              <span>{m.count} <span className="text-muted-foreground">({pct}%)</span></span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Signups by day */}
                {metrics.users.signupsByDay.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Signups — Last 30 Days</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-1 h-32">
                        {metrics.users.signupsByDay.map((day, i) => {
                          const max = Math.max(...metrics.users.signupsByDay.map(d => Number(d.count)));
                          const h = max > 0 ? (Number(day.count) / max) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              {Number(day.count) > 0 && <span className="text-[9px] text-muted-foreground">{day.count}</span>}
                              <div className="w-full bg-primary/70 rounded-t min-h-[2px]" style={{ height: `${Math.max(h, 2)}%` }} title={`${day.signup_date}: ${day.count}`} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{new Date(metrics.users.signupsByDay[0]?.signup_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(metrics.users.signupsByDay[metrics.users.signupsByDay.length - 1]?.signup_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent signups table */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" /> Recent Signups</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium">Email</th>
                            <th className="pb-2 font-medium">Method</th>
                            <th className="pb-2 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.users.recentSignups.map((u) => (
                            <tr key={u.id} className="border-b last:border-0">
                              <td className="py-2">{u.first_name} {u.last_name || ""}</td>
                              <td className="py-2 text-muted-foreground text-xs">{u.email}</td>
                              <td className="py-2"><Badge variant="outline" className="text-xs capitalize">{u.auth_method}</Badge></td>
                              <td className="py-2 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SUBSCRIPTIONS */}
            {activeTab === "subscriptions" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard title="Active Subscriptions" value={totalActiveSubs} icon={CreditCard} color="text-green-600" />
                  <MetricCard title="Individual Plans" value={getSubCount("individual", "active")} subtitle="$5.99/mo each" icon={Users} color="text-blue-600" />
                  <MetricCard title="Family Plans" value={getSubCount("family", "active")} subtitle="$9.99/mo each" icon={Home} color="text-purple-600" />
                  <MetricCard title="Est. MRR" value={`$${estMRR}`} subtitle="Monthly recurring" icon={TrendingUp} color="text-green-700" />
                </div>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">All Subscription Statuses</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.subscriptions.map((sub, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{sub.subscription_plan}</Badge>
                            <Badge variant={sub.subscription_status === "active" ? "default" : "secondary"} className="capitalize">{sub.subscription_status}</Badge>
                          </div>
                          <span className="font-semibold">{Number(sub.count)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {metrics.activeTrials && metrics.activeTrials.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        Active Trials
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-1">{metrics.activeTrials.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="pb-2 font-medium">User</th>
                              <th className="pb-2 font-medium">Email</th>
                              <th className="pb-2 font-medium">Plan</th>
                              <th className="pb-2 font-medium">Expires</th>
                              <th className="pb-2 font-medium">Days Left</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.activeTrials.map((trial) => {
                              const daysLeft = getDaysRemaining(trial.trial_end_date);
                              return (
                                <tr key={trial.id} className="border-b last:border-0">
                                  <td className="py-2 font-medium">{trial.first_name} {trial.last_name || ""}</td>
                                  <td className="py-2 text-muted-foreground text-xs">{trial.email}</td>
                                  <td className="py-2"><Badge variant="outline" className="capitalize text-xs">{trial.subscription_plan}</Badge></td>
                                  <td className="py-2 text-muted-foreground text-xs">{new Date(trial.trial_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                                  <td className="py-2"><Badge variant="outline" className={`text-xs ${getTrialBadgeColor(daysLeft)}`}>{daysLeft > 365 ? "Extended" : `${daysLeft}d`}</Badge></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ENGAGEMENT */}
            {activeTab === "engagement" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <MetricCard title="Tasks" value={metrics.engagement.tasks.total} subtitle={`${metrics.engagement.tasks.completed} completed (${taskCompletionRate}%)`} icon={CheckSquare} color="text-blue-600" />
                  <MetricCard title="Events" value={metrics.engagement.events} icon={Calendar} color="text-purple-600" />
                  <MetricCard title="Voice Notes" value={metrics.engagement.voiceNotes} icon={Mic} color="text-red-500" />
                  <MetricCard title="Text Notes" value={metrics.engagement.textNotes} icon={FileText} color="text-gray-600" />
                  <MetricCard title="Meal Plans" value={metrics.engagement.mealPlans} icon={Utensils} color="text-green-600" />
                  <MetricCard title="Grocery Items" value={metrics.engagement.groceryItems} icon={ShoppingCart} color="text-orange-500" />
                  <MetricCard title="Saved Passwords" value={metrics.engagement.passwords} icon={Lock} color="text-gray-700" />
                  <MetricCard title="Push Tokens" value={metrics.pushNotifications.activeTokens} subtitle={`${metrics.pushNotifications.totalTokens} total`} icon={Bell} color="text-yellow-600" />
                </div>

                {/* Family stats */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4 text-orange-600" /> Family Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Families", val: metrics.families.total },
                        { label: "Members", val: metrics.families.totalMembers },
                        { label: "Teens", val: metrics.families.totalTeens },
                        { label: "Children", val: metrics.families.totalChildren },
                      ].map((item, i) => (
                        <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold">{item.val}</p>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* FEEDBACK */}
            {activeTab === "feedback" && (
              <div className="space-y-6">
                {metrics.featureRequests.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Feature Requests & Feedback</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {metrics.featureRequests.map((fr, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">{fr.type.replace("_", " ")}</Badge>
                              <Badge variant={fr.status === "pending" ? "secondary" : "default"} className="capitalize">{fr.status}</Badge>
                            </div>
                            <span className="font-semibold">{Number(fr.count)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {metrics.satisfaction.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> User Satisfaction</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {metrics.satisfaction.map((s, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <Badge variant="outline" className="capitalize">{s.response || "No response"}</Badge>
                            <span className="font-semibold">{Number(s.count)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {metrics.referrals.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Share2 className="h-4 w-4 text-blue-500" /> Referral Shares</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {metrics.referrals.map((r, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <Badge variant="outline" className="capitalize">{r.platform}</Badge>
                            <div className="text-sm">
                              <span className="font-semibold">{Number(r.count)}</span>
                              {Number(r.bonus_count) > 0 && <span className="text-muted-foreground text-xs ml-2">({r.bonus_count} bonus claimed)</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {metrics.feedback.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-green-600" /> In-App Feedback Prompts</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {metrics.feedback.map((f, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <Badge variant="outline" className="capitalize">{f.response || "dismissed"}</Badge>
                            <div className="text-sm">
                              <span className="font-semibold">{Number(f.count)}</span>
                              {Number(f.review_requested) > 0 && <span className="text-muted-foreground text-xs ml-2">({f.review_requested} review requested)</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
