// hooks/useGpsTracking.ts
// Continuously pushes the technician's GPS position to the backend.
// Call startTracking() when the technician goes on-duty.

import { useRef } from 'react';
import { trackingService } from '@/services/index';
import { useAuth } from '@/hooks/useAuth';

export function useGpsTracking() {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);

  const startTracking = () => {
    if (!navigator.geolocation || !user) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        trackingService.updateLocation({
          userId: user.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
        }).catch(() => {});
      },
      (err) => console.warn('GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  return { startTracking, stopTracking };
}
