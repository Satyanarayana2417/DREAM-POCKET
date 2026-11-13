import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Loader2,
  Check,
  Calendar as CalendarIcon,
  User as UserIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { updateProfile } from "firebase/auth";

import { useAuth } from "@/lib/auth";
import { updateUserDoc, fetchUserDoc } from "@/lib/data";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { ImageCropperDialog } from "@/components/ImageCropper";
import { Avatar } from "@/components/AppShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/edit-profile")({
  component: EditProfilePage,
});

function EditProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Profile fields state
  const [name, setName] = useState(profile?.username || "");
  const [birthdate, setBirthdate] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("INR (₹)");

  // Modals for editing
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isBirthdateModalOpen, setIsBirthdateModalOpen] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  // Load existing profile details from Firestore
  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await fetchUserDoc(user.uid);
      if (data) {
        if (data["birthdate"]) setBirthdate(data["birthdate"] as string);
        if (data["gender"]) setGender(data["gender"] as string);
        if (data["phone"]) setPhone(data["phone"] as string);
        if (data["currency"]) setCurrency(data["currency"] as string);
        if (data["username"]) setName(data["username"] as string);
      }
    })();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be under 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!user) return;
    try {
      setIsUploading(true);
      setSelectedImage(null);

      const file = new File([blob], `avatar_${user.uid}_${Date.now()}.jpg`, { type: "image/jpeg" });
      const { url } = await uploadToCloudinary(file);

      await updateProfile(user, { photoURL: url });
      await updateUserDoc(user.uid, { photoURL: url });
      await refreshProfile();

      toast.success("Profile photo updated!");
    } catch (err: any) {
      console.error("Profile picture upload error:", err);
      toast.error(err?.message || "Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const saveField = async (updates: Record<string, any>, successMsg: string) => {
    if (!user) return;
    try {
      await updateUserDoc(user.uid, updates);
      if (updates["username"]) {
        await updateProfile(user, { displayName: updates["username"] });
      }
      await refreshProfile();
      toast.success(successMsg);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0c120f] font-sans text-foreground">
      {/* Top Bar Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="relative mx-auto max-w-xl flex h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/profile" });
              }
            }}
            className="size-9 rounded-full hover:bg-muted/60 active:scale-95 flex items-center justify-center text-foreground transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-5 stroke-[2.4]" />
          </button>

          <h1 className="text-base font-bold text-foreground font-display tracking-tight absolute left-1/2 -translate-x-1/2">
            Edit Profile
          </h1>

          <div className="size-9" />
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
        {/* Center Circular Avatar with Camera Badge */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="relative cursor-pointer group select-none"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            {isUploading ? (
              <div className="flex size-24 sm:size-28 items-center justify-center rounded-full bg-muted shadow-md border-2 border-emerald-500/40">
                <Loader2 className="size-7 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="relative">
                <div className="size-24 sm:size-28 rounded-full overflow-hidden ring-4 ring-white dark:ring-card shadow-lg bg-muted flex items-center justify-center group-hover:opacity-95 transition-opacity">
                  <Avatar photoURL={profile?.photoURL} name={name || "User"} size={112} />
                </div>
                {/* Camera icon badge at bottom-right */}
                <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-white dark:bg-[#1a2420] text-foreground border border-border shadow-md flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
                  <Camera className="size-4 stroke-[2.2] text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-2 font-medium">Tap to change profile photo</p>
        </div>

        {/* Section 1: Main Details */}
        <div className="rounded-2xl bg-white dark:bg-card border border-border/60 shadow-2xs overflow-hidden divide-y divide-border/40">
          {/* Row 1: Name */}
          <div
            onClick={() => setIsNameModalOpen(true)}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <span className="text-sm font-semibold text-muted-foreground">Name</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
                {name || profile?.username || "Add name"}
              </span>
              <ChevronRight className="size-4.5 text-muted-foreground/60 shrink-0" strokeWidth={2.2} />
            </div>
          </div>

          {/* Row 2: Dream Pocket */}
          <div className="flex items-center justify-between p-4">
            <span className="text-sm font-semibold text-muted-foreground">Dream Pocket</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="size-3" />
                Premium User
              </span>
              <ChevronRight className="size-4.5 text-muted-foreground/40 shrink-0" strokeWidth={2.2} />
            </div>
          </div>
        </div>

        {/* Section 2: Private Information */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase px-1">
            Private Information
          </h2>

          <div className="rounded-2xl bg-white dark:bg-card border border-border/60 shadow-2xs overflow-hidden divide-y divide-border/40">
            {/* Row 1: Email (read-only) */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm font-semibold text-muted-foreground">Email</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate max-w-[220px]">
                  {profile?.email || user?.email}
                </span>
                <ChevronRight className="size-4.5 text-muted-foreground/40 shrink-0" strokeWidth={2.2} />
              </div>
            </div>

            {/* Row 2: Birthdate */}
            <div
              onClick={() => setIsBirthdateModalOpen(true)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm font-semibold text-muted-foreground">Birthdate</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  {birthdate || "04-July-2004"}
                </span>
                <ChevronRight className="size-4.5 text-muted-foreground/60 shrink-0" strokeWidth={2.2} />
              </div>
            </div>

            {/* Row 3: Gender */}
            <div
              onClick={() => setIsGenderModalOpen(true)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm font-semibold text-muted-foreground">Gender</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  {gender || "Male"}
                </span>
                <ChevronRight className="size-4.5 text-muted-foreground/60 shrink-0" strokeWidth={2.2} />
              </div>
            </div>

            {/* Row 4: Phone */}
            <div
              onClick={() => setIsPhoneModalOpen(true)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm font-semibold text-muted-foreground">Phone</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  {phone || "+91 98765 43210"}
                </span>
                <ChevronRight className="size-4.5 text-muted-foreground/60 shrink-0" strokeWidth={2.2} />
              </div>
            </div>

            {/* Row 5: Currency */}
            <div className="flex items-center justify-between p-4">
              <span className="text-sm font-semibold text-muted-foreground">Currency</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  {currency || "INR (₹)"}
                </span>
                <ChevronRight className="size-4.5 text-muted-foreground/40 shrink-0" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Cropper Dialog */}
      {selectedImage && (
        <ImageCropperDialog
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* 1. Edit Name Dialog */}
      <Dialog open={isNameModalOpen} onOpenChange={setIsNameModalOpen}>
        <DialogContent className="sm:max-w-md bg-background rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display">Update Name</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold mb-1.5 block">Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="rounded-xl h-11"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsNameModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveField({ username: name.trim() }, "Name updated successfully");
                setIsNameModalOpen(false);
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Birthdate Dialog */}
      <Dialog open={isBirthdateModalOpen} onOpenChange={setIsBirthdateModalOpen}>
        <DialogContent className="sm:max-w-md bg-background rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display">Update Birthdate</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold mb-1.5 block">Date of Birth</Label>
            <Input
              type="date"
              defaultValue={birthdate ? birthdate : "2004-07-04"}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const d = new Date(val);
                  const formatted = d.toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  });
                  setBirthdate(formatted);
                }
              }}
              className="rounded-xl h-11"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBirthdateModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveField({ birthdate }, "Birthdate updated");
                setIsBirthdateModalOpen(false);
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Edit Gender Dialog */}
      <Dialog open={isGenderModalOpen} onOpenChange={setIsGenderModalOpen}>
        <DialogContent className="sm:max-w-md bg-background rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display">Select Gender</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGender(g);
                  saveField({ gender: g }, "Gender updated");
                  setIsGenderModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                  gender === g
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span>{g}</span>
                {gender === g && <Check className="size-4 stroke-[2.5]" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Edit Phone Dialog */}
      <Dialog open={isPhoneModalOpen} onOpenChange={setIsPhoneModalOpen}>
        <DialogContent className="sm:max-w-md bg-background rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display">Update Phone Number</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold mb-1.5 block">Phone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="rounded-xl h-11"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPhoneModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveField({ phone: phone.trim() }, "Phone updated");
                setIsPhoneModalOpen(false);
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

