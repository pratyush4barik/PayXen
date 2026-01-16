import Layout from "@/components/layout";
import { useGroups, useCreateGroup, useGroupMembers, useAddGroupMember } from "@/hooks/use-groups";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, UserPlus, Wallet, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  if (isLoading) {
    return (
      <Layout>
         <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
         <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map(i => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)}
         </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Group Wallets</h1>
          <p className="text-muted-foreground mt-1">Split subscription costs with friends and family.</p>
        </div>
        <CreateGroupDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups?.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}

        {groups?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl bg-muted/10 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold font-display">No Groups Yet</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              Create a group wallet to track shared subscriptions like Netflix Family, Spotify Duo, or rent.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl">
              Create Your First Group
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}

function GroupCard({ group }: { group: any }) {
  const { data: members } = useGroupMembers(group.id);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  return (
    <Card className="rounded-2xl border border-border/60 shadow-lg shadow-black/5 hover:border-primary/50 transition-all">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Wallet className="w-5 h-5" />
          </div>
          <Badge variant="secondary" className="font-mono">
            {members?.length || 0} Members
          </Badge>
        </div>
        <CardTitle className="mt-3 text-xl">{group.name}</CardTitle>
        <CardDescription>Created on {new Date(group.createdAt).toLocaleDateString()}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members Split</p>
          {members?.map((member) => (
            <div key={member.id} className="flex justify-between items-center text-sm p-2 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs font-bold">
                  {member.memberName.charAt(0)}
                </div>
                <span>{member.memberName}</span>
              </div>
              <span className="font-mono font-medium">{member.splitPercentage}%</span>
            </div>
          ))}
          {members?.length === 0 && <p className="text-sm text-muted-foreground italic">No members yet.</p>}
        </div>

        <AddMemberDialog 
          groupId={group.id} 
          open={isAddMemberOpen} 
          onOpenChange={setIsAddMemberOpen} 
        />
      </CardContent>
    </Card>
  );
}

function CreateGroupDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const { mutate, isPending } = useCreateGroup();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ name }, {
      onSuccess: () => {
        onOpenChange(false);
        setName("");
        toast({ title: "Group created!" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> New Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group Wallet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Roommates, Family Plan" 
              required
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            Create Group
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ groupId, open, onOpenChange }: { groupId: number, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [split, setSplit] = useState("50");
  const { mutate, isPending } = useAddGroupMember();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ 
      groupId, 
      data: { memberName: name, splitPercentage: Number(split) } // Hook coerces string for decimal
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setName("");
        setSplit("50");
        toast({ title: "Member added!" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed">
          <UserPlus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Group Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Member Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="John Doe" 
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Split Percentage (%)</Label>
            <Input 
              type="number"
              min="0"
              max="100"
              value={split} 
              onChange={(e) => setSplit(e.target.value)} 
              required
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            Add Member
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
