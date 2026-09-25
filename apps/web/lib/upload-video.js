import * as tus from 'tus-js-client';
import { supabase, supabaseUrl } from './supabase';

export async function uploadVideo(path, file, onProgress = () => {}) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Your session expired. Sign in again before publishing.');
  const projectHost = new URL(supabaseUrl).hostname;
  const storageHost = projectHost.replace('.supabase.co', '.storage.supabase.co');

  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${storageHost}/storage/v1/upload/resumable`,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { authorization: `Bearer ${session.access_token}` },
      metadata: { bucketName: 'listing-media', objectName: path, contentType: 'video/mp4', cacheControl: '3600' },
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onError: reject,
      onSuccess: resolve,
    });
    upload.start();
  });
  return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
}
