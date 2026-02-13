import { supabase } from '../lib/supabase';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for source video
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_THUMBNAIL_DURATION = 4;
const POSTER_MAX_WIDTH_LANDSCAPE = 480;
const POSTER_MAX_WIDTH_PORTRAIT = 270;
const THUMBNAIL_VIDEO_MAX_WIDTH = 480;
const THUMBNAIL_VIDEO_BITRATE = 500000; // 500kbps

export interface ProcessedVideoThumbnail {
  poster: string;
  video: string;
}

export interface VideoValidationError {
  valid: false;
  error: string;
}

export interface VideoValidationSuccess {
  valid: true;
}

export type VideoValidationResult = VideoValidationError | VideoValidationSuccess;

export function validateVideoFile(file: File): VideoValidationResult {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only MP4, WebM, and MOV videos are allowed.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 50MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return { valid: true };
}

async function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };

    video.src = url;
  });
}

function extractPosterFrame(
  video: HTMLVideoElement,
  isPortrait: boolean
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const maxWidth = isPortrait ? POSTER_MAX_WIDTH_PORTRAIT : POSTER_MAX_WIDTH_LANDSCAPE;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;

    video.currentTime = 0;

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create poster blob'));
          }
        },
        'image/jpeg',
        0.85
      );
    };

    video.onerror = () => {
      reject(new Error('Failed to seek video for poster frame'));
    };
  });
}

async function compressVideoThumbnail(
  file: File,
  maxDuration: number,
  isPortrait: boolean = false
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.preload = 'auto';

    await new Promise<void>((res) => {
      video.onloadedmetadata = () => res();
    });

    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > THUMBNAIL_VIDEO_MAX_WIDTH) {
      height = (height * THUMBNAIL_VIDEO_MAX_WIDTH) / width;
      width = THUMBNAIL_VIDEO_MAX_WIDTH;
    }

    canvas.width = width;
    canvas.height = height;

    const stream = canvas.captureStream(30);
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = destination.stream.getAudioTracks()[0];

    const recordStream = new MediaStream();
    recordStream.addTrack(videoTrack);
    if (audioTrack) {
      recordStream.addTrack(audioTrack);
    }

    const mediaRecorder = new MediaRecorder(recordStream, {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: THUMBNAIL_VIDEO_BITRATE,
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      URL.revokeObjectURL(url);
      audioContext.close();
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.onerror = () => {
      URL.revokeObjectURL(url);
      audioContext.close();
      reject(new Error('Failed to record video'));
    };

    const actualDuration = Math.min(video.duration, maxDuration);

    video.currentTime = 0;
    video.play();

    const drawFrame = () => {
      if (video.currentTime < actualDuration) {
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(drawFrame);
      } else {
        video.pause();
        mediaRecorder.stop();
      }
    };

    mediaRecorder.start();
    drawFrame();

    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        video.pause();
        mediaRecorder.stop();
      }
    }, (actualDuration + 0.5) * 1000);
  });
}

async function uploadToContentMedia(
  blob: Blob,
  fileName: string,
  subfolder: string,
  contentType: string,
  bucket: string = 'portfolio-images'
): Promise<string> {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const extension = contentType.includes('video') ? 'webm' : 'jpg';
  const storagePath = `${subfolder}/${timestamp}-${randomString}-${fileName}.${extension}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to ${bucket}: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

export async function processAndUploadVideoThumbnail(
  file: File,
  isPortrait: boolean = false,
  onProgress?: (stage: string) => void,
  bucket: string = 'portfolio-images'
): Promise<ProcessedVideoThumbnail> {
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    onProgress?.('Loading video...');
    const video = await loadVideo(file);

    onProgress?.('Extracting poster frame...');
    const posterBlob = await extractPosterFrame(video, isPortrait);

    onProgress?.('Compressing thumbnail video...');
    const thumbnailBlob = await compressVideoThumbnail(file, MAX_THUMBNAIL_DURATION, isPortrait);

    const baseFileName = file.name.replace(/\.[^/.]+$/, '');

    onProgress?.('Uploading poster image...');
    const posterUrl = await uploadToContentMedia(
      posterBlob,
      `${baseFileName}-poster`,
      'video-posters',
      'image/jpeg',
      bucket
    );

    onProgress?.('Uploading thumbnail video...');
    const videoUrl = await uploadToContentMedia(
      thumbnailBlob,
      `${baseFileName}-thumb`,
      'video-thumbnails',
      'video/webm',
      bucket
    );

    onProgress?.('Complete!');

    return {
      poster: posterUrl,
      video: videoUrl,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process and upload video thumbnail');
  }
}

export async function deleteVideoThumbnails(
  posterUrl: string | null,
  videoUrl: string | null
): Promise<void> {
  const extractBucketAndPath = (url: string): { bucket: string; path: string } | null => {
    const buckets = ['portfolio-images', 'blog-images', 'content-media'];
    for (const bucket of buckets) {
      const parts = url.split(`/${bucket}/`);
      if (parts.length === 2) {
        return { bucket, path: parts[1] };
      }
    }
    return null;
  };

  if (posterUrl) {
    const result = extractBucketAndPath(posterUrl);
    if (result) {
      const { error } = await supabase.storage
        .from(result.bucket)
        .remove([result.path]);
      if (error) {
        console.error('Failed to delete poster image:', error);
      }
    }
  }

  if (videoUrl) {
    const result = extractBucketAndPath(videoUrl);
    if (result) {
      const { error } = await supabase.storage
        .from(result.bucket)
        .remove([result.path]);
      if (error) {
        console.error('Failed to delete thumbnail video:', error);
      }
    }
  }
}
