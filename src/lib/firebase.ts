import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AdSpot, AdReservation, ReservationStatus } from '@/types/adSpot';
import { INITIAL_SPOTS, INITIAL_RESERVATIONS } from '@/data/seedData';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'your-project-id'
  );
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined' && isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn('[Firebase] Initialization error, falling back to LocalStorage adapter:', error);
  }
}

export { app, db, storage };

// --- LocalStorage Adapter & SSOT Fallback Manager ---

const STORAGE_KEYS = {
  SPOTS: 'ad_spots_master_v1',
  RESERVATIONS: 'ad_reservations_v1',
  INITIALIZED: 'ad_spot_initialized_v1',
};

function getLocalData<T>(key: string, defaultData: T): T {
  if (typeof window === 'undefined') return defaultData;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw) as T;
  } catch {
    return defaultData;
  }
}

function setLocalData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[LocalStorage] Failed to save key ${key}:`, e);
  }
}

/**
 * Service Layer that abstracts Firebase vs LocalStorage
 */
export const adSpotService = {
  /**
   * Check connection status
   */
  isCloudConnected(): boolean {
    return isFirebaseConfigured() && db !== null;
  },

  /**
   * Reset or re-seed data
   */
  async resetToSeed(): Promise<{ spots: AdSpot[]; reservations: AdReservation[] }> {
    if (this.isCloudConnected() && db) {
      // Sync seeds to Firestore
      for (const spot of INITIAL_SPOTS) {
        await setDoc(doc(db, 'ad_spots', spot.spotId), spot);
      }
      for (const res of INITIAL_RESERVATIONS) {
        await setDoc(doc(db, 'ad_reservations', res.reservationId), res);
      }
    }
    // Also update LocalStorage
    setLocalData(STORAGE_KEYS.SPOTS, INITIAL_SPOTS);
    setLocalData(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    setLocalData(STORAGE_KEYS.INITIALIZED, 'true');
    return { spots: INITIAL_SPOTS, reservations: INITIAL_RESERVATIONS };
  },

  /**
   * Fetch all spots
   */
  async getSpots(): Promise<AdSpot[]> {
    if (this.isCloudConnected() && db) {
      try {
        const colRef = collection(db, 'ad_spots');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as AdSpot);
        }
      } catch (err) {
        console.warn('[Firestore] Error fetching spots, using fallback:', err);
      }
    }
    return getLocalData<AdSpot[]>(STORAGE_KEYS.SPOTS, INITIAL_SPOTS);
  },

  /**
   * Fetch all reservations
   */
  async getReservations(): Promise<AdReservation[]> {
    let list: AdReservation[] = [];
    if (this.isCloudConnected() && db) {
      try {
        const colRef = collection(db, 'ad_reservations');
        const q = query(colRef, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          list = snap.docs.map((d) => d.data() as AdReservation);
        }
      } catch (err) {
        console.warn('[Firestore] Error fetching reservations, using fallback:', err);
      }
    }
    if (list.length === 0) {
      list = getLocalData<AdReservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    }

    // Auto calculate EXPIRED_OVERDUE: if today > endDate && status === 'INSTALLED'
    const todayStr = new Date().toISOString().split('T')[0];
    let hasChanges = false;
    const updated = list.map((res) => {
      if (res.status === 'INSTALLED' && res.endDate < todayStr) {
        hasChanges = true;
        return {
          ...res,
          status: 'EXPIRED_OVERDUE' as ReservationStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return res;
    });

    if (hasChanges) {
      setLocalData(STORAGE_KEYS.RESERVATIONS, updated);
    }

    return updated;
  },

  /**
   * Check for date overlap conflicts (Fail-Fast Rule)
   * Conflict rule: existing.startDate <= newReq.endDate && existing.endDate >= newReq.startDate
   * for statuses in ['PENDING', 'APPROVED', 'INSTALLED', 'EXPIRED_OVERDUE']
   */
  async checkOverlap(
    spotId: string,
    startDate: string,
    endDate: string,
    excludeReservationId?: string
  ): Promise<AdReservation | null> {
    if (startDate > endDate) {
      throw new Error('시작일은 종료일보다 이전이어야 합니다.');
    }

    const all = await this.getReservations();
    const blockingStatuses: ReservationStatus[] = ['PENDING', 'APPROVED', 'INSTALLED', 'EXPIRED_OVERDUE'];

    const conflict = all.find((res) => {
      if (res.spotId !== spotId) return false;
      if (excludeReservationId && res.reservationId === excludeReservationId) return false;
      if (!blockingStatuses.includes(res.status)) return false;

      // Overlap formula
      return res.startDate <= endDate && res.endDate >= startDate;
    });

    return conflict || null;
  },

  /**
   * Create a new reservation with Overlap Validation
   */
  async createReservation(
    newReservation: Omit<AdReservation, 'reservationId' | 'status' | 'rejectReason' | 'createdAt' | 'updatedAt' | 'installedImageUrl'>
  ): Promise<AdReservation> {
    // 1. Check overlap
    const conflict = await this.checkOverlap(
      newReservation.spotId,
      newReservation.startDate,
      newReservation.endDate
    );

    if (conflict) {
      throw new Error(
        `[일정 중복 발생] 해당 기간은 이미 '${conflict.requesterDept} ${conflict.requesterName}' 님의 "${conflict.title}" 건이 점유 중입니다. (${conflict.startDate} ~ ${conflict.endDate})`
      );
    }

    const reservationId = `RES-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const now = new Date().toISOString();

    const reservation: AdReservation = {
      ...newReservation,
      reservationId,
      status: 'PENDING',
      installedImageUrl: null,
      rejectReason: null,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isCloudConnected() && db) {
      try {
        await setDoc(doc(db, 'ad_reservations', reservationId), reservation);
      } catch (err) {
        console.error('[Firestore] createReservation failed, falling back to local:', err);
      }
    }

    const current = getLocalData<AdReservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    setLocalData(STORAGE_KEYS.RESERVATIONS, [reservation, ...current]);

    return reservation;
  },

  /**
   * Update reservation status
   */
  async updateReservationStatus(
    reservationId: string,
    status: ReservationStatus,
    patch?: {
      rejectReason?: string | null;
      installedImageUrl?: string | null;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    const updatePayload: Partial<AdReservation> = {
      status,
      updatedAt: now,
      ...(patch || {}),
    };

    if (this.isCloudConnected() && db) {
      try {
        await updateDoc(doc(db, 'ad_reservations', reservationId), updatePayload);
      } catch (err) {
        console.error('[Firestore] updateDoc failed:', err);
      }
    }

    const current = getLocalData<AdReservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
    const updated = current.map((res) =>
      res.reservationId === reservationId ? { ...res, ...updatePayload } : res
    );
    setLocalData(STORAGE_KEYS.RESERVATIONS, updated);
  },

  /**
   * Image upload (Storage or Base64 data URL)
   */
  async uploadImage(file: File, folder: string = 'ad_images'): Promise<string> {
    if (this.isCloudConnected() && storage) {
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
      } catch (err) {
        console.warn('[Firebase Storage] Upload failed, falling back to base64 DataURL:', err);
      }
    }

    // Base64 DataURL fallback for instant zero-config & offline compatibility
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Add or Edit Spot Master
   */
  async saveSpot(spot: AdSpot): Promise<void> {
    if (this.isCloudConnected() && db) {
      try {
        await setDoc(doc(db, 'ad_spots', spot.spotId), spot);
      } catch (err) {
        console.error('[Firestore] saveSpot failed:', err);
      }
    }

    const current = getLocalData<AdSpot[]>(STORAGE_KEYS.SPOTS, INITIAL_SPOTS);
    const exists = current.some((s) => s.spotId === spot.spotId);
    const updated = exists
      ? current.map((s) => (s.spotId === spot.spotId ? spot : s))
      : [...current, spot];
    setLocalData(STORAGE_KEYS.SPOTS, updated);
  },

  /**
   * Toggle spot active status
   */
  async toggleSpotActive(spotId: string, isActive: boolean): Promise<void> {
    if (this.isCloudConnected() && db) {
      try {
        await updateDoc(doc(db, 'ad_spots', spotId), { isActive });
      } catch (err) {
        console.error('[Firestore] toggleSpotActive failed:', err);
      }
    }

    const current = getLocalData<AdSpot[]>(STORAGE_KEYS.SPOTS, INITIAL_SPOTS);
    const updated = current.map((s) => (s.spotId === spotId ? { ...s, isActive } : s));
    setLocalData(STORAGE_KEYS.SPOTS, updated);
  },
};
