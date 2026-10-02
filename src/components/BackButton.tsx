import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";

interface BackButtonProps {
  fallback?: string;
  className?: string;
  iconClassName?: string;
}

export function BackButton({ fallback = "/", className = "", iconClassName = "size-5" }: BackButtonProps) {
  const router = useRouter();
  const navigate = useNavigate();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (router.history.canGoBack()) {
      router.history.back();
    } else {
      navigate({ to: fallback });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleBack} 
      className={`text-foreground hover:bg-muted rounded-full transition-colors active:scale-95 ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className={iconClassName} />
    </Button>
  );
}
