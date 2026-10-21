import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface DevicePermissionsStatus {
  camera: 'granted' | 'denied' | 'prompt' | 'unknown';
}

class DevicePermissionsService {
  private readonly PROMPT_SHOWN_KEY = 'taxvault_permissions_prompted_v1';
  private readonly CAMERA_GRANTED_KEY = 'taxvault_camera_granted_v1';

  /**
   * Check current camera permission state using Capacitor Camera plugin and Web Permissions API.
   * Uses local cache to avoid re-querying system bridges unnecessarily.
   */
  async checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    // 1. Check local persistent cache
    try {
      if (localStorage.getItem(this.CAMERA_GRANTED_KEY) === 'true') {
        return 'granted';
      }
    } catch {}

    // 2. Try Capacitor Native Camera Plugin first (for Android APK & iOS)
    if (Capacitor.isPluginAvailable('Camera')) {
      try {
        const capStatus = await Camera.checkPermissions();
        if (capStatus.camera === 'granted') {
          this.markCameraGranted();
          return 'granted';
        }
        if (capStatus.camera === 'denied') {
          return 'denied';
        }
        if (capStatus.camera === 'prompt' || capStatus.camera === 'prompt-with-rationale') {
          return 'prompt';
        }
      } catch {
        // Native check unavailable or threw
      }
    }

    // 3. Fallback to Web Permissions API (desktop browser)
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as any });
        if (result.state === 'granted') {
          this.markCameraGranted();
          return 'granted';
        }
        return result.state as 'granted' | 'denied' | 'prompt';
      }
    } catch {
      // Permissions query not supported
    }

    return 'unknown';
  }

  /**
   * Explicitly request camera permission just-in-time when user initiates scan.
   * Requests ONLY 'camera' permission (never 'photos', which triggers extra Android 13 dialogs).
   * Caches granted state to prevent any repeated prompts in the future.
   */
  async requestCameraPermission(): Promise<{ granted: boolean; fallbackMode?: boolean; error?: string }> {
    // 1. If already granted, return immediately with zero prompts
    const current = await this.checkCameraPermission();
    if (current === 'granted') {
      this.markPromptShown();
      return { granted: true };
    }

    // 2. Try native Android / iOS Capacitor Camera permission prompt (camera only)
    if (Capacitor.isPluginAvailable('Camera')) {
      try {
        const capRequest = await Camera.requestPermissions({ permissions: ['camera'] });
        if (capRequest.camera === 'granted') {
          this.markCameraGranted();
          this.markPromptShown();
          return { granted: true };
        }
        if (capRequest.camera === 'denied') {
          this.markPromptShown();
          return { granted: false, fallbackMode: true };
        }
      } catch (err: any) {
        console.warn('Capacitor Camera.requestPermissions error:', err);
      }
    }

    // 3. For web browser where Capacitor is not active: try WebRTC getUserMedia ONCE
    if (!Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach((track) => track.stop());
        this.markCameraGranted();
        this.markPromptShown();
        return { granted: true };
      } catch (err: any) {
        console.warn('Web getUserMedia error:', err);
      }
    }

    this.markPromptShown();
    return {
      granted: false,
      fallbackMode: true,
    };
  }

  markCameraGranted(): void {
    try {
      localStorage.setItem(this.CAMERA_GRANTED_KEY, 'true');
    } catch {}
  }

  hasBeenPrompted(): boolean {
    try {
      if (localStorage.getItem(this.CAMERA_GRANTED_KEY) === 'true') {
        return true;
      }
      return localStorage.getItem(this.PROMPT_SHOWN_KEY) === 'true';
    } catch {
      return false;
    }
  }

  markPromptShown(): void {
    try {
      localStorage.setItem(this.PROMPT_SHOWN_KEY, 'true');
    } catch {}
  }

  resetPromptState(): void {
    try {
      localStorage.removeItem(this.PROMPT_SHOWN_KEY);
      localStorage.removeItem(this.CAMERA_GRANTED_KEY);
    } catch {}
  }
}

export const devicePermissions = new DevicePermissionsService();
