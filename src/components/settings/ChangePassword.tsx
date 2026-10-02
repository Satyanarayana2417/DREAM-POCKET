import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export function ChangePassword() {
  const { user } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (!user || !user.email) {
      return setError("You must be logged in to change your password.");
    }

    setIsLoading(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Current password is incorrect.");
      } else {
        setError(err.message || "Failed to change password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-card p-5 rounded-[24px] border border-border shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-1">Change Password</h2>
        <p className="text-sm text-muted-foreground mb-6">Update your account password securely.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">{error}</div>}
          {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl font-medium border border-emerald-100">Password changed successfully!</div>}
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">Current Password</label>
            <Input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-muted border-0 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-slate-300"
              placeholder="Enter current password"
              required
            />
          </div>
          
          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-semibold text-foreground ml-1">New Password</label>
            <Input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-muted border-0 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-slate-300"
              placeholder="Enter new password"
              required
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground ml-1">Confirm New Password</label>
            <Input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted border-0 h-12 rounded-xl px-4 focus-visible:ring-1 focus-visible:ring-slate-300"
              placeholder="Confirm new password"
              required
            />
          </div>
          
          <Button type="submit" className="w-full h-12 rounded-xl mt-6 text-[15px] font-semibold" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
