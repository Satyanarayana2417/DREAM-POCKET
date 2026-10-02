import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { LogOut, User, Mail, Calendar, Shield, Edit2, Check, X, ChevronRight, ChevronLeft, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
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

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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
      {/* Fixed background to ensure full screen expansion and fix iOS bg-fixed bugs */}
      <div className="fixed inset-0 w-full h-full z-0">
        <img src="/tropical-bg.png" alt="" className="w-full h-full object-cover dark:opacity-20" />
        <div className="absolute inset-0 bg-[#F9F7F2]/40 dark:bg-background/80 backdrop-blur-[2px]"></div>
      </div>
      
      <div className="mx-auto max-w-xl min-h-screen pb-20 relative z-10">
          {/* Header */}
          <div className="relative flex items-center justify-center px-4 py-4 pt-2">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="absolute left-4 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-foreground">
              <ArrowLeft className="size-6" strokeWidth={2.5} />
            </Button>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">Profile</h1>
          </div>

          {/* Profile Info Header */}
          <div className="flex flex-col items-center mt-2 mb-6 px-4">
            <div className="relative cursor-pointer group mb-2" onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
              {/* Pink Glow Behind Avatar */}
              <div className="absolute inset-0 bg-pink-500/50 dark:bg-pink-500/20 blur-[30px] rounded-full transform scale-110"></div>
              
              {isUploading ? (
                <div className="flex size-[120px] items-center justify-center rounded-full bg-muted shadow-sm border-[4px] border-card relative z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-full shadow-lg border-[4px] border-card relative overflow-hidden group-active:scale-95 transition-transform z-10">
                    <Avatar photoURL={profile.photoURL} name={profile.username || "User"} size={120} />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-card rounded-full p-2 shadow-md border border-border z-20 transition-transform group-active:scale-95">
                    <Camera className="text-foreground size-5" strokeWidth={2} />
                  </div>
                </>
              )}
            </div>
            
            <h2 className="text-[24px] font-bold text-foreground tracking-tight relative z-10 drop-shadow-sm">
              {profile.username}
            </h2>
            <p className="text-[15px] text-muted-foreground mt-1 relative z-10 font-medium drop-shadow-sm">{profile.email}</p>
          </div>

          {/* Info Cards */}
          {/* Info Cards */}
          <div className="px-5 space-y-1.5">
            
            {/* Name Row */}
            <div className="bg-white/30 dark:bg-card/40 backdrop-blur-2xl rounded-[32px] px-4 py-3 flex items-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-white/40 dark:border-white/10">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-white/40 dark:bg-white/10 text-foreground shrink-0 mr-4 border border-white/50 dark:border-white/5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] dark:shadow-none">
                <User className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Name</p>
                {isEditingName ? (
                  <Input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-6 px-0 border-0 shadow-none text-[15px] text-foreground focus-visible:ring-0 w-full p-0 bg-transparent placeholder:text-muted-foreground/50"
                    placeholder="Enter full name"
                    autoFocus
                    onBlur={saveName}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  />
                ) : (
                  <p className="text-[15px] font-medium text-muted-foreground truncate">{profile.username}</p>
                )}
              </div>
              {!isEditingName ? (
                <Button size="icon" variant="ghost" onClick={startEditing} className="size-10 text-foreground/70 hover:bg-white/20 dark:hover:bg-white/5 rounded-full shrink-0 -mr-2">
                  <Edit2 className="size-5" strokeWidth={2} />
                </Button>
              ) : (
                <Button size="icon" variant="ghost" onClick={saveName} className="size-10 text-emerald-600 hover:bg-white/20 dark:hover:bg-white/5 rounded-full shrink-0 -mr-2">
                  <Check className="size-6" strokeWidth={2.5} />
                </Button>
              )}
            </div>

            {/* Email Row */}
            <div className="bg-white/30 dark:bg-card/40 backdrop-blur-2xl rounded-[32px] px-4 py-3 flex items-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-white/40 dark:border-white/10">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-white/40 dark:bg-white/10 text-foreground shrink-0 mr-4 border border-white/50 dark:border-white/5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] dark:shadow-none">
                <Mail className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Email</p>
                <p className="text-[15px] font-medium text-muted-foreground truncate">{profile.email}</p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>

            {/* Member Since Row */}
            <div className="bg-white/30 dark:bg-card/40 backdrop-blur-2xl rounded-[32px] px-4 py-3 flex items-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-white/40 dark:border-white/10">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-white/40 dark:bg-white/10 text-foreground shrink-0 mr-4 border border-white/50 dark:border-white/5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] dark:shadow-none">
                <Calendar className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Member Since</p>
                <p className="text-[15px] font-medium text-muted-foreground truncate">{format(joinDate, "MMMM yyyy")}</p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>

            {/* Account Provider Row */}
            <div className="bg-white/30 dark:bg-card/40 backdrop-blur-2xl rounded-[32px] px-4 py-3 flex items-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-white/40 dark:border-white/10">
              <div className="flex items-center justify-center size-[52px] rounded-full bg-white/40 dark:bg-white/10 shrink-0 mr-4 border border-white/50 dark:border-white/5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] dark:shadow-none">
                {(profile.provider === "google.com" || profile.provider === "google") ? (
                  <GoogleLogo />
                ) : (
                  <Shield className="size-6 text-foreground" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground mb-0.5">Account Provider</p>
                <p className="text-[15px] font-medium text-muted-foreground truncate">{profile.provider === "google.com" || profile.provider === "google" ? "Google" : "Email"}</p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>

            {/* Settings Row */}
            <div 
              className="bg-white/30 dark:bg-card/40 backdrop-blur-2xl rounded-[32px] px-4 py-3 flex items-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-white/40 dark:border-white/10 mb-6 cursor-pointer active:scale-[0.98] transition-transform mt-6"
              onClick={() => navigate({ to: "/settings" })}
            >
              <div className="flex items-center justify-center size-[52px] rounded-full bg-white/40 dark:bg-white/10 text-foreground shrink-0 mr-4 border border-white/50 dark:border-white/5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] dark:shadow-none">
                <SettingsIcon className="size-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[15px] font-bold text-foreground">Settings</p>
              </div>
              <ChevronRight className="size-5 text-foreground/40 shrink-0" strokeWidth={1.5} />
            </div>
            
            <div className="pb-8"></div>
          </div>
      </div>
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
