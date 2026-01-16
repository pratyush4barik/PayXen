import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useCreateSubscription } from "@/hooks/use-subscriptions";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SubscriptionDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [autoCancel, setAutoCancel] = useState("false");
  
  const { mutate, isPending } = useCreateSubscription();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost || !startDate) return;

    mutate(
      {
        name,
        cost: Number(cost),
        billingCycle,
        startDate: new Date(startDate).toISOString(), // Use coerce in mutation if needed, but schema expects date obj/string
        autoCancel: autoCancel === "true",
        isActive: true,
      },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
          toast({
            title: "Subscription added",
            description: `${name} has been added to your dashboard.`,
          });
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const resetForm = () => {
    setName("");
    setCost("");
    setBillingCycle("monthly");
    setStartDate(new Date().toISOString().split("T")[0]);
    setAutoCancel("false");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl px-6">
          <Plus className="w-4 h-4" /> Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">New Subscription</DialogTitle>
          <DialogDescription>
            Add a new recurring expense to track.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              placeholder="Netflix, Spotify, Adobe..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7 rounded-xl"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cycle">Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger id="cycle" className="rounded-xl">
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Start Date</Label>
            <Input
              id="date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ghost">Ghost Cancel Protection</Label>
            <Select value={autoCancel} onValueChange={setAutoCancel}>
              <SelectTrigger id="ghost" className="rounded-xl">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Off (Manual)</SelectItem>
                <SelectItem value="true">On (Auto-cancel if unused)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              If enabled, we'll mark it cancelled if unused for 30 days.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-xl bg-primary">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Subscription
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
