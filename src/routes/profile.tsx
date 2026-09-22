import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { LogOut, User, Mail, Calendar, Shield, Edit2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { updateUserDoc } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell, Avatar } from "@/components/AppShell";
import { ImageCropperDialog } from "@/components/ImageCropper";
import { Camera, Loader2 } from "lucide-react";
import { useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { firebaseStorage } from "@/lib/firebase";

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
    if (editName.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    updateNameMutation.mutate(editName.trim());
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
      <h1 className="text-2xl font-bold sm:text-3xl">Profile</h1>

      <Card>
        <CardContent className="flex flex-col items-center pt-6 pb-8 text-center sm:flex-row sm:text-left sm:gap-6">
          <div className="relative mb-4 sm:mb-0 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            {isUploading ? (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="relative">
                <Avatar photoURL={profile.photoURL} name={profile.username || "User"} size={96} />
                {/* Persistent Camera Badge */}
                <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 border-2 border-white shadow-sm z-10 transition-transform active:scale-95">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
            
            {(profile.provider === "google.com" || profile.provider === "google") && (
              <div className="absolute bottom-0 left-0 rounded-full bg-white p-1 shadow-sm border border-slate-100 z-10">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="max-w-[200px]"
                    placeholder="Enter full name"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={saveName} disabled={updateNameMutation.isPending}>
                    <Check className="size-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}>
                    <X className="size-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{profile.username}</h2>
                  <Button size="icon" variant="ghost" onClick={startEditing} className="size-8 text-muted-foreground">
                    <Edit2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
            <p className="text-muted-foreground mb-4">{profile.email}</p>
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Details</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <User className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Full Name</p>
              <p className="text-sm text-muted-foreground">{profile.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Mail className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Email Address</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground">{format(joinDate, "MMMM yyyy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
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
