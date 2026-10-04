import { useState } from "react";
import { LogOut, Trash2, Mail, Key, UserCircle, ChevronRight, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function AccountSettings() {
  const { user, profile, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const provider = profile?.provider || "email";
  const isGoogle = provider === "google.com" || provider === "google";

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/login", replace: true });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Typically we need re-authentication here in Firebase for sensitive operations,
      // but for this UI we will simulate the destructive action by showing an error or calling user.delete()
      if (user) {
        await user.delete();
      }
      await logout();
      navigate({ to: "/login", replace: true });
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      alert(error.message || "Failed to delete account. You may need to log in again first.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-6">
        <SettingsGroup title="Login & Account">
          <SettingsRow
            icon={Mail}
            iconBg="bg-blue-500"
            title="Email"
            value={<span className="text-sm font-medium text-muted-foreground truncate max-w-[150px] sm:max-w-[200px] block">{user?.email}</span>}
          />
          <SettingsRow
            icon={UserCircle}
            iconBg="bg-indigo-500"
            title="Login Provider"
            value={<span className="text-sm font-medium text-muted-foreground whitespace-nowrap text-right block">{isGoogle ? "Google" : "Email & Password"}</span>}
          />
          <SettingsRow
            icon={Key}
            iconBg="bg-amber-500"
            title="Password"
            value={<span className="text-sm font-medium text-muted-foreground whitespace-nowrap text-right block">{isGoogle ? "Managed by Google" : "Change Password"}</span>}
            onClick={isGoogle ? undefined : () => navigate({ to: '/settings', search: { view: 'account', subview: 'change-password' } })}
          />
        </SettingsGroup>

        <SettingsGroup title="Account Actions">
          <SettingsRow
            icon={LogOut}
            iconBg="bg-transparent !text-red-500"
            title="Sign Out"
            titleClass="text-red-500"
            onClick={handleLogout}
          />
          <SettingsRow
            icon={Trash2}
            iconBg="bg-red-500"
            title="Delete Account"
            onClick={() => setShowDeleteConfirm(true)}
          />
        </SettingsGroup>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md bg-card border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="size-5 text-red-500" />
              Delete Account?
            </DialogTitle>
            <DialogDescription className="text-[15px] text-muted-foreground pt-3">
              This will permanently delete your account and associated financial data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto rounded-xl border-border" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="w-full sm:w-auto rounded-xl bg-red-500 hover:bg-red-600" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
