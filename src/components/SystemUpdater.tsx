// @ts-nocheck
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';
import { DownloadCloud, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { clearCachedData } from '@/lib/offlineEngine';

export function SystemUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Optional: Check for updates periodically
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // Check every hour
      }
    },
    onRegisterError(error) {
      console.error('SW Registration Error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999]"
      >
        <div className="bg-gradient-to-r from-primary to-orange-500 rounded-xl shadow-2xl p-4 text-white flex items-start gap-4">
          <div className="bg-white/20 p-2 rounded-lg">
            <DownloadCloud className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-bold text-lg mb-1">تحديث جديد متاح!</h4>
            <p className="text-sm text-white/90 mb-3">
              تم إصدار نسخة جديدة من النظام أسرع وأكثر استقراراً. يرجى التحديث الآن.
            </p>
            
            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  await clearCachedData();
                  updateServiceWorker(true);
                }}
                className="bg-white text-primary hover:bg-white/90 font-bold flex-1"
                size="sm"
              >
                تحديث النظام الآن
              </Button>
              <Button 
                onClick={() => setNeedRefresh(false)}
                variant="ghost" 
                size="icon"
                className="hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
