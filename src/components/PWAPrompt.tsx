import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WifiOff, Download } from 'lucide-react';
import { toast } from 'sonner';

export function PWAPrompt() {
  const [isOffline, setIsOffline] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (offlineReady) {
      toast.success('App ready to work offline');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  return (
    <>
      {/* Offline Warning */}
      {isOffline && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl shadow-lg flex items-start gap-3 pointer-events-auto">
          <WifiOff className="size-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">You're offline.</p>
            <p className="text-xs mt-0.5 opacity-90">Some data may not be available until you reconnect.</p>
          </div>
        </div>
      )}

      {/* Update Available Prompt */}
      {needRefresh && (
        <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-white border border-slate-200 px-4 py-4 rounded-2xl shadow-xl flex flex-col gap-3 pointer-events-auto">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-100 p-2 rounded-full shrink-0">
              <Download className="size-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-slate-900">New version available</p>
              <p className="text-xs text-slate-500 mt-0.5">Update to get the latest features and fixes.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <Button variant="outline" size="sm" onClick={() => setNeedRefresh(false)} className="text-xs h-8">
              Later
            </Button>
            <Button size="sm" onClick={() => updateServiceWorker(true)} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
              Update now
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
