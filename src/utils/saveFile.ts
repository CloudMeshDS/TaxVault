import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** True inside the Android/iOS app, where browser downloads and printing do nothing. */
export const isNativeApp = () => Capacitor.isNativePlatform();

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Saves a file the user asked for. Browsers download it. The app's WebView ignores
 * <a download>, so there the file is written to the app cache and handed to the share sheet,
 * where the user can save it to Files or Drive, or send it on.
 */
export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  if (!isNativeApp()) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Revoke later so the browser has time to read the file
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 60000);
    return;
  }

  const path = fileName.replace(/[\\/:*?"<>|]+/g, '_');
  const { uri } = await Filesystem.writeFile({ path, data: await blobToBase64(blob), directory: Directory.Cache });
  try {
    await Share.share({ title: path, files: [uri] });
  } catch (err: any) {
    // Closing the share sheet without picking anything is not an error
    if (!/cancel/i.test(String(err?.message || err))) throw err;
  }
}

/** saveFile for a file the app only has as a URL (data: or https:), such as a receipt image. */
export async function saveFileFromUrl(url: string, fileName: string): Promise<void> {
  const blob = await (await fetch(url)).blob();
  await saveFile(blob, fileName);
}
