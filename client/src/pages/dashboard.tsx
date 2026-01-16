import Layout from "@/components/layout";
import { useDashboardStats, useSubscriptions } from "@/hooks/use-subscriptions";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from "recharts";
import { 
  DollarSign, 
  Activity, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Calendar 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();

  const isLoading = statsLoading || subsLoading;

  // Transform data for chart
  const chartData = subscriptions
    ?.filter(s => s.isActive)
    .map(sub => ({
      name: sub.name,
      cost: Number(sub.cost)
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5); // Top 5

  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#10b981"];

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-card rounded-2xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Financial Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your recurring expenses and optimize your spending.
          </p>
        </div>
        <SubscriptionDialog />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          title="Total Monthly Spend" 
          value={`$${stats?.totalMonthlySpend.toFixed(2)}`}
          icon={DollarSign}
          trend="+2.5% vs last month"
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard 
          title="Active Subscriptions" 
          value={stats?.activeCount}
          icon={Activity}
          color="text-green-600"
          bg="bg-green-100 dark:bg-green-900/20"
        />
        <StatCard 
          title="Cancelled / Inactive" 
          value={stats?.cancelledCount}
          icon={XCircle}
          color="text-muted-foreground"
          bg="bg-muted"
        />
        <StatCard 
          title="Wasted Value" 
          value={stats?.wasteCount}
          description="Subs with low usage"
          icon={AlertTriangle}
          color="text-orange-600"
          bg="bg-orange-100 dark:bg-orange-900/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Chart */}
        <Card className="lg:col-span-2 border-none shadow-lg shadow-black/5 dark:shadow-black/20 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]} barSize={32}>
                    {chartData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Renewals */}
        <Card className="border-none shadow-lg shadow-black/5 dark:shadow-black/20 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Upcoming Renewals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions
                ?.filter(s => s.isActive && s.daysUntilRenewal <= 14)
                .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
                .slice(0, 5)
                .map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center font-bold text-foreground text-sm shadow-sm">
                        {sub.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{sub.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub.billingCycle} • ${Number(sub.cost).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        sub.daysUntilRenewal <= 3 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {sub.daysUntilRenewal === 0 ? "Today" : `${sub.daysUntilRenewal} days`}
                      </p>
                    </div>
                  </div>
              ))}
              
              {(!subscriptions || subscriptions.filter(s => s.isActive && s.daysUntilRenewal <= 14).length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No upcoming renewals soon.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, description, icon: Icon, trend, color, bg }: any) {
  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", bg, color)}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-display font-bold text-foreground">{value}</h3>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
}
