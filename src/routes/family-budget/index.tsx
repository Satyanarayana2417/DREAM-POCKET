import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, ArrowRight, Wallet, Check, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchFamilies, createFamily, fetchPendingInvitations, acceptInvitation, rejectInvitation } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/family-budget/")({
  component: FamilyBudgetRoute,
});

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  initialBudget: z.coerce.number().min(0, "Budget cannot be negative").optional(),
});

function FamilyBudgetRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: families = [], isLoading } = useQuery({
    queryKey: ["families", user?.uid],
    queryFn: () => fetchFamilies(user!.uid),
    enabled: !!user,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["pendingInvitations", user?.uid],
    queryFn: () => fetchPendingInvitations(user!.uid),
    enabled: !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: (familyId: string) => acceptInvitation(familyId, user!.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["families", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations", user?.uid] });
      toast.success("Invitation accepted!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to accept invitation"),
  });

  const rejectMutation = useMutation({
    mutationFn: (familyId: string) => rejectInvitation(familyId, user!.uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingInvitations", user?.uid] });
      toast.success("Invitation declined.");
    },
    onError: (err: any) => toast.error(err.message || "Failed to decline invitation"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      initialBudget: "" as unknown as number,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!user) throw new Error("Not authenticated");
      const budget = values.initialBudget || 0;
      return await createFamily(values.name, user.uid, budget);
    },
    onSuccess: (familyId) => {
      queryClient.invalidateQueries({ queryKey: ["families", user?.uid] });
      toast.success("Family created successfully!");
      setIsDialogOpen(false);
      form.reset();
      navigate({ to: "/family-budget/$familyId", params: { familyId } });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create family");
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate(values);
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold sm:text-3xl sm:font-bold">Family Budget</h1>
          {families.length > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground shadow-soft">
                  <Plus className="mr-2 size-4" /> Create Family
                </Button>
              </DialogTrigger>
              <CreateFamilyContent form={form} onSubmit={onSubmit} isPending={createMutation.isPending} />
            </Dialog>
          )}
        </div>

        {invitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Pending Invitations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {invitations.map((inv) => (
                <Card key={inv.id} className="border-border/50 border-orange-200 bg-orange-50/50">
                  <CardContent className="p-4">
                    <p className="font-semibold mb-1">{inv.familyName}</p>
                    <p className="text-sm text-muted-foreground mb-4">You have been invited to join this family.</p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => acceptMutation.mutate(inv.id)}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        className="bg-primary text-primary-foreground"
                      >
                        <Check className="mr-1 size-4" /> Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => rejectMutation.mutate(inv.id)}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                      >
                        <X className="mr-1 size-4" /> Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading families...</div>
        ) : families.length === 0 ? (
          <Card className="mt-8 border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4 text-primary">
                <Users className="size-8" />
              </div>
              <h3 className="mb-2 font-bold text-xl">No Family Yet</h3>
              <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                Create a family budget and invite your family members to manage expenses together seamlessly.
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-gradient-primary shadow-soft">
                    <Plus className="mr-2 size-4" /> Create Family
                  </Button>
                </DialogTrigger>
                <CreateFamilyContent form={form} onSubmit={onSubmit} isPending={createMutation.isPending} />
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {families.map((family) => (
              <Card key={family.id} className="overflow-hidden transition-all hover:shadow-md border-border/50">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg mb-1">{family.familyName}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Users className="size-3.5" /> {family.memberIds.length} Members
                        </p>
                      </div>
                      <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                        <Wallet className="size-5" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-secondary/50 px-6 py-4 flex items-center justify-between border-t border-border/50">
                    <span className="text-sm font-medium text-foreground">Manage family</span>
                    <Button asChild variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary -mr-2">
                      <Link to="/family-budget/$familyId" params={{ familyId: family.id }}>
                        View Family <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CreateFamilyContent({ form, onSubmit, isPending }: any) {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Create a Family</DialogTitle>
        <DialogDescription>
          Set up a shared space to track budget and expenses with your family members.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Family Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. My Home, The Smiths" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="initialBudget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Budget (Optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                    <Input type="number" placeholder="0.00" className="pl-7" {...field} value={field.value ?? ""} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-2">
            <Button type="submit" className="w-full bg-gradient-primary shadow-soft" disabled={isPending}>
              {isPending ? "Creating..." : "Create Family"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}
