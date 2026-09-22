import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Search, CheckCircle2, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { fetchAllUsers, createFamilyInvitation, fetchFamilyMembers, fetchFamilyById } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/AppShell";

export function AddFamilyMemberDialog({ familyId, customTrigger }: { familyId: string, customTrigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => fetchAllUsers(),
  });

  const { data: existingMembers = [] } = useQuery({
    queryKey: ["familyMembers", familyId],
    queryFn: () => fetchFamilyMembers(familyId),
  });

  const existingMemberIds = new Set(existingMembers.map((m) => m.userId));

  const filteredUsers = allUsers.filter(u => !existingMemberIds.has(u["uid"]));

  const searchResults = search.trim() === "" 
    ? filteredUsers 
    : filteredUsers.filter((u: any) => 
        (u["email"] && u["email"].toLowerCase().includes(search.toLowerCase())) ||
        (u["username"] && u["username"].toLowerCase().includes(search.toLowerCase()))
      );

  const addMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!user) throw new Error("Not authenticated");
      const fam = await fetchFamilyById(familyId);
      if (!fam) throw new Error("Family not found");
      await createFamilyInvitation(familyId, fam.familyName, userId, user.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers", familyId] });
      toast.success("Invitation sent successfully!");
      setIsOpen(false);
      setSearch("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add member");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {customTrigger ? customTrigger : (
          <Button variant="outline" size="sm" className="shadow-sm">
            <UserPlus className="mr-2 size-4" /> Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
          <DialogDescription>
            Search and select registered users to add to your family.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {isLoading && <p className="text-center text-sm text-muted-foreground">Searching...</p>}
            {!isLoading && searchResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>
            )}
            {searchResults.map((u: any) => (
              <div key={u["uid"]} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <Avatar name={u["username"] || u["email"]} photoURL={u["photoURL"]} size={36} />
                  <div>
                    <p className="font-semibold text-sm">{u["username"] || "User"}</p>
                    <p className="text-xs text-muted-foreground">{u["email"]}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => addMutation.mutate(u["uid"])}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? "Inviting..." : "Invite"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
