import Layout from "@/components/layout";
import { useSubscriptions, useDeleteSubscription, useLogUsage, useUpdateSubscription } from "@/hooks/use-subscriptions";
import { SubscriptionDialog } from "@/components/subscription-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Ghost, 
  RefreshCcw,
  Zap,
  MoreVertical
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionsPage() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const { mutate: logUsage } = useLogUsage();
  const { toast } = useToast();
  
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { mutate: deleteSub } = useDeleteSubscription();
  const { mutate: updateSub } = useUpdateSubscription();

  const handleLogUsage = (id: number, name: string) => {
    logUsage(id, {
      onSuccess: () => {
        toast({
          title: "Usage Logged",
          description: `Recorded a use for ${name}. Stats updated!`,
          duration: 3000,
        });
      }
    });
  };

  const handleToggleActive = (id: number, currentStatus: boolean) => {
    updateSub({
      id,
      data: { isActive: !currentStatus }
    }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-card rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage, track usage, and cancel unwanted services.</p>
        </div>
        <SubscriptionDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions?.map((sub) => (
          <Card 
            key={sub.id} 
            className={cn(
              "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/60",
              !sub.isActive && "opacity-70 bg-muted/30"
            )}
          >
            {/* Status Stripe */}
            <div className={cn(
              "absolute top-0 left-0 w-1.5 h-full",
              sub.isActive ? "bg-primary" : "bg-muted-foreground"
            )} />

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-background border shadow-sm flex items-center justify-center font-bold text-lg text-primary">
                    {sub.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{sub.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <span className="capitalize">{sub.billingCycle}</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">${Number(sub.cost).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggleActive(sub.id, sub.isActive)}>
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      {sub.isActive ? "Mark Inactive" : "Reactivate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ExternalLink className="w-4 h-4 mr-2" /> Visit Site
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteId(sub.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stats & Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="secondary" className={cn(
                  "px-2.5 py-0.5 rounded-md text-xs font-semibold border",
                  sub.valueScore === "Good" && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800",
                  sub.valueScore === "Average" && "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800",
                  sub.valueScore === "Waste" && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:border-red-800",
                )}>
                  {sub.valueScore} Value
                </Badge>
                
                {sub.autoCancel && (
                  <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800">
                    <Ghost className="w-3 h-3 mr-1" /> Ghost Watch
                  </Badge>
                )}

                <Badge variant="outline" className="text-xs">
                  CPU: {sub.costPerUse}
                </Badge>
              </div>

              {/* Action Area */}
              <div className="pt-4 border-t border-dashed flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Used <strong className="text-foreground">{sub.usageCount}</strong> times
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="rounded-lg h-8 border-primary/20 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all"
                  onClick={() => handleLogUsage(sub.id, sub.name)}
                  disabled={!sub.isActive}
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  Log Use
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        {subscriptions?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-2xl bg-muted/20">
            <Ghost className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-bold text-lg">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-4">Add your first subscription to start tracking.</p>
            <SubscriptionDialog />
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the subscription and all its usage data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteSub(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
