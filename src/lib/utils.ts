import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateKorean(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
  }
  return dateStr;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return dateStr;
}

export function calculateDurationDays(startDate: string, endDate: string): number {
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.round(diff / (1000 * 3600 * 24)) + 1);
  } catch {
    return 1;
  }
}

export function formatDimensions(widthMm: number, heightMm: number): string {
  return `${widthMm.toLocaleString()} × ${heightMm.toLocaleString()} mm`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      textArea.remove();
      return Promise.resolve(true);
    } catch {
      textArea.remove();
      return Promise.resolve(false);
    }
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  ratioPercent: number;
  width: number;
  height: number;
}

/**
 * Client-side Automatic Image Resizing and Compression (Cost & Storage Optimization)
 * Drastically reduces smartphone camera photos (10~20MB) to ~200~400KB before cloud upload
 */
export async function compressAndResizeImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    format = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve({
        file,
        dataUrl: '',
        originalSize: file.size,
        compressedSize: file.size,
        ratioPercent: 0,
        width: 0,
        height: 0,
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          file,
          dataUrl: reader.result as string,
          originalSize: file.size,
          compressedSize: file.size,
          ratioPercent: 0,
          width: 0,
          height: 0,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Constrain dimensions while preserving natural aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          file,
          dataUrl: objectUrl,
          originalSize: file.size,
          compressedSize: file.size,
          ratioPercent: 0,
          width,
          height,
        });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }

          const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const compressedFile = new File([blob], cleanName, {
            type: format,
            lastModified: Date.now(),
          });

          const dataUrl = canvas.toDataURL(format, quality);
          const ratioPercent =
            file.size > 0
              ? Math.max(0, Math.round(((file.size - compressedFile.size) / file.size) * 100))
              : 0;

          resolve({
            file: compressedFile,
            dataUrl,
            originalSize: file.size,
            compressedSize: compressedFile.size,
            ratioPercent,
            width,
            height,
          });
        },
        format,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
