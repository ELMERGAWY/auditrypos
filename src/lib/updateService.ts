// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

const APP_VERSION = '1.0.0';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface UpdateInfo {
  has_update: boolean;
  latest_version: string;
  force_update: boolean;
  release_notes: string | null;
}

class UpdateService {
  private checkInterval: number | null = null;
  private deviceId: string;
  private restaurantId: string | null = null;

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('auditry_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('auditry_device_id', deviceId);
    }
    return deviceId;
  }

  private isWeakDevice(): boolean {
    // Detect weak devices based on hardware concurrency and memory
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 8;
    return cores <= 2 || memory <= 2;
  }

  private getPlatform(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Android')) return 'android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
    if (ua.includes('Windows')) return 'windows';
    if (ua.includes('Mac')) return 'macos';
    if (ua.includes('Linux')) return 'linux';
    return 'unknown';
  }

  async recordCheckIn(restaurantId: string): Promise<void> {
    if (!restaurantId) {
      console.warn('Cannot record check-in: restaurantId is null');
      return;
    }
    this.restaurantId = restaurantId;
    try {
      await supabase.rpc('record_device_check_in', {
        p_restaurant_id: restaurantId,
        p_device_id: this.deviceId,
        p_current_version: APP_VERSION,
        p_user_agent: navigator.userAgent,
        p_platform: this.getPlatform(),
        p_is_weak_device: this.isWeakDevice()
      });
    } catch (error) {
      console.error('Failed to record device check-in:', error);
    }
  }

  async checkForUpdates(restaurantId: string): Promise<UpdateInfo | null> {
    if (!restaurantId) {
      console.warn('Cannot check for updates: restaurantId is null');
      return null;
    }
    try {
      const { data, error } = await supabase.rpc('check_for_update', {
        p_current_version: APP_VERSION,
        p_restaurant_id: restaurantId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const updateInfo: UpdateInfo = {
          has_update: data[0].has_update,
          latest_version: data[0].latest_version,
          force_update: data[0].force_update,
          release_notes: data[0].release_notes
        };

        if (updateInfo.has_update) {
          this.handleUpdateAvailable(updateInfo);
        }

        return updateInfo;
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
    return null;
  }

  private handleUpdateAvailable(updateInfo: UpdateInfo): void {
    if (updateInfo.force_update) {
      // Force update - show alert and prevent interaction
      alert(`يتوفر تحديث إجباري للنظام (${updateInfo.latest_version}). سيتم إعادة التحميل الآن...\n\n${updateInfo.release_notes || ''}`);
      
      // Force reload immediately
      this.forceReload();
    } else {
      // Optional update - show notification
      const shouldUpdate = confirm(`يتوفر تحديث جديد للنظام (${updateInfo.latest_version})\n\n${updateInfo.release_notes || ''}\n\nهل تريد التحديث الآن؟`);
      
      if (shouldUpdate) {
        this.forceReload();
      }
    }
  }

  private forceReload(): void {
    // Clear cache and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Reload with timestamp to bypass cache
    window.location.href = `${window.location.pathname}?t=${Date.now()}`;
  }

  startPeriodicCheck(restaurantId: string): void {
    if (!restaurantId) {
      console.warn('Cannot start periodic check: restaurantId is null');
      return;
    }
    this.restaurantId = restaurantId;
    
    // Delay initial check to avoid blocking initial page load
    setTimeout(() => {
      this.checkForUpdates(restaurantId);
      this.recordCheckIn(restaurantId);
    }, 3000); // 3 seconds delay

    // Start periodic checks
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkForUpdates(restaurantId);
      this.recordCheckIn(restaurantId);
    }, CHECK_INTERVAL);
  }

  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async forceUpdateCheck(restaurantId: string): Promise<void> {
    await this.recordCheckIn(restaurantId);
    const updateInfo = await this.checkForUpdates(restaurantId);
    
    if (updateInfo && updateInfo.has_update) {
      if (updateInfo.force_update) {
        this.forceReload();
      }
    }
  }
}

export const updateService = new UpdateService();
