import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { 
  Bell, Trash2, CheckCircle2, Circle, AlertCircle, TrendingUp, Target, Users, LayoutDashboard 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { 
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  deleteSelectedNotifications, 
  deleteAllNotifications,
  type AppNotification
} from "@/lib/notificationHistory";
import { FullPageLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/notifications")({
  component: NotificationsRoute,
});

function getIconForType(type: AppNotification["type"]) {
  switch (type) {
    case "expense": return <TrendingUp className="size-5 text-red-500" />;
    case "income": return <TrendingUp className="size-5 text-emerald-500" />;
    case "family": return <Users className="size-5 text-blue-500" />;
    default: return <Bell className="size-5 text-muted-foreground" />;
  }
}

function NotificationsRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }

    const unsub = subscribeToNotifications(user.uid, (data) => {
      setNotifications(data);
      setIsLoadingData(false);
      
      // Cleanup selected IDs that might have been deleted
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        const existingIds = new Set(data.map(n => n.id));
        for (const id of Array.from(newSet)) {
          if (!existingIds.has(id)) newSet.delete(id);
        }
        return newSet;
      });
    });

    return () => unsub();
  }, [user, loading, navigate]);

  if (loading || isLoadingData) return <FullPageLoader label="Loading notifications..." />;
  if (!user) return null;

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    await deleteSelectedNotifications(user.uid, Array.from(selectedIds));
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} notifications deleted`);
  };

  const handleDeleteAll = async () => {
    if (confirm("Delete all notifications? All notification history will be permanently deleted.")) {
      await deleteAllNotifications(user.uid);
      setSelectedIds(new Set());
      toast.success("All notifications deleted");
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(user.uid);
    toast.success("All marked as read");
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationAsRead(user.uid, n.id);
    }
    if (n.route) {
      navigate({ to: n.route });
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BackButton fallback="/" />
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-xs">
                <CheckCircle2 className="size-4 mr-1.5" /> Mark all read
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteAll} className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20">
                <Trash2 className="size-4 mr-1.5" /> Delete all
              </Button>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center justify-between bg-card p-3 mb-4 rounded-xl shadow-sm border border-border">
            <div 
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={toggleSelectAll}
            >
              <div className={`flex items-center justify-center size-5 rounded-md border ${
                allSelected ? "bg-emerald-600 border-emerald-600" : 
                someSelected ? "bg-emerald-600 border-emerald-600" : "border-border"
              }`}>
                {allSelected && <CheckCircle2 className="size-3.5 text-white" />}
                {someSelected && <div className="w-2.5 h-0.5 bg-card rounded-full" />}
              </div>
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
              </span>
            </div>

            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                Delete Selected
              </Button>
            )}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No notifications yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
              Your notifications will appear here. We'll let you know when something important happens!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map(n => (
              <NotificationCard 
                key={n.id} 
                notification={n}
                isSelected={selectedIds.has(n.id)}
                onToggleSelect={(e) => toggleSelect(n.id, e)}
                onClick={() => handleNotificationClick(n)}
                onDelete={() => deleteNotification(user.uid, n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function NotificationCard({ 
  notification, 
  isSelected, 
  onToggleSelect, 
  onClick,
  onDelete
}: { 
  notification: AppNotification;
  isSelected: boolean;
  onToggleSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState(0);

  // Swipe logic
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return;
    const diff = e.touches[0].clientX - startX;
    // Only allow swipe right
    if (diff > 0 && diff < 100) {
      setCurrentX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (currentX > 60) {
      onDelete();
    }
    setStartX(null);
    setCurrentX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-red-50" onClick={onClick}>
      {/* Background Delete Action Layer (revealed on swipe) */}
      <div className="absolute inset-y-0 left-0 w-24 flex items-center justify-start pl-6 text-red-600 bg-red-100">
        <Trash2 className="size-6" />
      </div>

      {/* Foreground Card */}
      <div 
        ref={cardRef}
        className={`relative flex items-start gap-3 p-4 bg-card border border-border transition-all duration-200 cursor-pointer ${
          !notification.read ? 'bg-muted/80 shadow-sm border-l-4 border-l-emerald-500' : 'opacity-80'
        }`}
        style={{ transform: `translateX(${currentX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="pt-1 select-none"
          onClick={onToggleSelect}
        >
          {isSelected ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : (
            <Circle className="size-5 text-muted-foreground hover:text-muted-foreground transition-colors" />
          )}
        </div>

        <div className="mt-1 flex-shrink-0 bg-muted p-2 rounded-full">
          {getIconForType(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`text-sm truncate ${!notification.read ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
              {notification.title}
            </h3>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className={`text-sm mt-0.5 line-clamp-2 ${!notification.read ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            {notification.body}
          </p>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="hidden sm:flex p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
