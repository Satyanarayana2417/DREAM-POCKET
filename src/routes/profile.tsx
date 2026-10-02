import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { LogOut, User, Mail, Calendar, Shield, Edit2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Download, CheckCircle2, Share, PlusSquare } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { updateUserDoc } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SettingsGroup, SettingsRow } from "@/components/SettingsUI";
import { AppShell, Avatar } from "@/components/AppShell";
import { ImageCropperDialog } from "@/components/ImageCropper";
import { Camera, Loader2 } from "lucide-react";
import { useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { firebaseStorage } from "@/lib/firebase";
import { AppLockSettings } from "@/components/AppLockSettings";
import { NotificationSettings } from "@/components/NotificationSettings";

export const Route = createFileRoute("/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    navigate({ to: "/login", replace: true });
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const startEditing = () => {
    setEditName(profile?.username || "");
    setIsEditingName(true);
  };

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!user) throw new Error("Not authenticated");
      await updateUserDoc(user.uid, { username: newName });
    },
    onSuccess: () => {
      toast.success("Profile name updated!");
      setIsEditingName(false);
      refreshProfile();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update name");
    },
  });

  const saveName = () => {
    if (!editName.trim()) return;
    if (editName === profile?.username) {
      setIsEditingName(false);
      return;
    }
    updateNameMutation.mutate(editName.trim());
  };

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const uploadProfilePicture = async (blob: Blob) => {
    if (!user) return;
    try {
      setIsUploading(true);
      setSelectedImage(null); // Close cropper
      const storage = firebaseStorage();
      const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      
      // Update Firebase Auth
      await updateProfile(user, { photoURL: url });
      // Update Firestore Doc
      await updateUserDoc(user.uid, { photoURL: url });
      
      toast.success("Profile picture updated!");
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload picture");
    } finally {
      setIsUploading(false);
    }
  };

  if (!profile) return null;

  const joinDate = (profile as any).createdAt
    ? new Date((profile as any).createdAt.seconds * 1000)
    : new Date();

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl px-2">Settings</h1>

      <SettingsGroup className="mt-4">
        <div className="flex items-center gap-4 p-4 bg-white cursor-pointer active:bg-slate-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
          <div className="relative">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            {isUploading ? (
              <div className="flex size-[60px] items-center justify-center rounded-full bg-slate-100">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <Avatar photoURL={profile.photoURL} name={profile.username || "User"} size={60} />
            )}
          </div>
          <div className="flex-1 flex justify-between items-center">
             <div>
               <h2 className="text-xl font-semibold text-slate-900 leading-tight">
                 {isEditingName ? (
                   <Input 
                     value={editName}
                     onChange={(e) => setEditName(e.target.value)}
                     className="max-w-[200px] h-8"
                     placeholder="Enter full name"
                     autoFocus
                     onClick={(e) => e.stopPropagation()}
                     onBlur={saveName}
                     onKeyDown={(e) => e.key === 'Enter' && saveName()}
                   />
                 ) : (
                   profile.username
                 )}
               </h2>
               <p className="text-[13px] text-slate-500 mt-0.5">{profile.email}</p>
             </div>
             <div className="flex items-center gap-2">
                {!isEditingName && (
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); startEditing(); }} className="size-8 text-slate-400">
                    <Edit2 className="size-4" />
                  </Button>
                )}
             </div>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon={Calendar}
          iconBg="bg-blue-500"
          title="Member Since"
          value={format(joinDate, "MMMM yyyy")}
        />
        <SettingsRow
          icon={Mail}
          iconBg="bg-indigo-500"
          title="Account Provider"
          value={profile.provider === "google.com" || profile.provider === "google" ? "Google" : "Email"}
        />
      </SettingsGroup>

      <AppLockSettings />
      <NotificationSettings />

      <SettingsGroup>
        <SettingsRow
          icon={Download}
          iconBg="bg-emerald-500"
          title="Install Application"
          value={
            isInstalled ? (
              <span className="text-emerald-600 font-medium">Installed</span>
            ) : installPrompt || isIOS ? (
              <Button size="sm" variant="ghost" className="h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2" onClick={installPrompt ? handleInstallClick : () => setShowIOSInstructions(true)}>
                Install
              </Button>
            ) : (
              <span className="text-slate-400 text-sm">Not Supported</span>
            )
          }
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon={LogOut}
          iconBg="bg-red-500"
          title="Sign Out"
          onClick={handleLogout}
        />
      </SettingsGroup>
      </div>

      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install Home Expense Manager</DialogTitle>
            <DialogDescription>
              Install this application on your home screen for quick and easy access when you're on the go.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-center size-8 rounded-full bg-slate-200 text-slate-700 font-semibold shrink-0">1</div>
              <p className="text-sm text-slate-700">Tap the <Share className="inline size-5 mx-1 mb-1" /> <strong>Share</strong> button at the bottom of Safari.</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-center size-8 rounded-full bg-slate-200 text-slate-700 font-semibold shrink-0">2</div>
              <p className="text-sm text-slate-700">Scroll down and tap <PlusSquare className="inline size-5 mx-1 mb-1" /> <strong>Add to Home Screen</strong>.</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-center size-8 rounded-full bg-slate-200 text-slate-700 font-semibold shrink-0">3</div>
              <p className="text-sm text-slate-700">Tap <strong>Add</strong> in the top right corner.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowIOSInstructions(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
      {selectedImage && (
        <ImageCropperDialog
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageSrc={selectedImage}
          onCropComplete={uploadProfilePicture}
        />
      )}
    </AppShell>
  );
}
