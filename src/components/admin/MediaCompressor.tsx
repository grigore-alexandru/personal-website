import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Upload, Download, FileImage, FileVideo, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { designTokens } from '../../styles/tokens';

const COMPRESSION_SETTINGS = {
  low: {
    image: { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true },
    video: { crf: '23', resolution: 'scale=-1:1080', preset: 'fast' }
  },
  medium: {
    image: { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true },
    video: { crf: '28', resolution: 'scale=-1:720', preset: 'veryfast' }
  },
  hard: {
    image: { maxSizeMB: 0.1, maxWidthOrHeight: 640, useWebWorker: true },
    video: { crf: '35', resolution: 'scale=-1:480', preset: 'ultrafast' }
  }
};

type CompressionLevel = 'low' | 'medium' | 'hard';
type ResultType = {
  type: 'image' | 'video';
  url: string;
  originalSize: number;
  compressedSize: number;
  filename: string;
};

export const MediaCompressor: React.FC = () => {
  const [level, setLevel] = useState<CompressionLevel>('medium');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<ResultType | null>(null);
  const [error, setError] = useState('');

  const ffmpegRef = useRef(new FFmpeg());
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setFfmpegLoading(true);

      if (typeof SharedArrayBuffer === 'undefined') {
        console.error('SharedArrayBuffer is not available');
        setError('Video compression requires a modern browser with SharedArrayBuffer support. Try Chrome, Edge, or Firefox. If deployed, ensure Cross-Origin headers are set.');
        setFfmpegLoading(false);
        return;
      }

      if (!crossOriginIsolated) {
        console.error('Not in cross-origin isolated context');
        setError('Video compression requires secure Cross-Origin isolation. This works in development and will work after deployment with proper headers.');
        setFfmpegLoading(false);
        return;
      }

      try {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpeg = ffmpegRef.current;

        ffmpeg.on('log', ({ message }) => {
          console.log(message);
        });

        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setFfmpegLoaded(true);
      } catch (err) {
        console.error('FFmpeg load error:', err);
        setError(`Video compression failed to load: ${err instanceof Error ? err.message : 'Unknown error'}. Image compression will still work.`);
      } finally {
        setFfmpegLoading(false);
      }
    };
    load();
  }, []);

  const compressImage = async (file: File) => {
    setStatus(`Compressing image with ${level} compression...`);
    setError('');

    try {
      const options = COMPRESSION_SETTINGS[level].image;
      const compressedBlob = await imageCompression(file, options);

      const url = URL.createObjectURL(compressedBlob);
      setResult({
        type: 'image',
        url,
        originalSize: file.size,
        compressedSize: compressedBlob.size,
        filename: file.name
      });
      setStatus('Image compressed successfully!');
    } catch (err) {
      console.error(err);
      setError('Image compression failed. Please try again.');
    }
    setProcessing(false);
  };

  const compressVideo = async (file: File) => {
    if (!ffmpegLoaded) {
      setError('Video compression engine is still loading. Please wait.');
      setProcessing(false);
      return;
    }

    setStatus(`Compressing video with ${level} compression... This may take several minutes.`);
    setError('');

    const ffmpeg = ffmpegRef.current;
    const settings = COMPRESSION_SETTINGS[level].video;

    try {
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', settings.resolution,
        '-c:v', 'libx264',
        '-crf', settings.crf,
        '-preset', settings.preset,
        '-c:a', 'aac',
        '-b:a', '128k',
        'output.mp4'
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      setResult({
        type: 'video',
        url,
        originalSize: file.size,
        compressedSize: blob.size,
        filename: file.name
      });
      setStatus('Video compressed successfully!');
    } catch (err) {
      console.error(err);
      setError('Video compression failed. Ensure browser supports SharedArrayBuffer.');
    }
    setProcessing(false);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setProcessing(true);
    setResult(null);
    setError('');
    setStatus('');

    if (file.type.startsWith('image/')) {
      await compressImage(file);
    } else if (file.type.startsWith('video/')) {
      await compressVideo(file);
    } else {
      setError('Unsupported file type. Please upload images or videos only.');
      setProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    multiple: false
  });

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return (bytes / 1024).toFixed(2) + ' KB';
    return mb.toFixed(2) + ' MB';
  };

  const getCompressionRatio = () => {
    if (!result) return 0;
    return ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: designTokens.typography.fontFamily }}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-black mb-2">Media Compressor</h2>
        <p className="text-neutral-600">Compress images and videos for optimal web performance</p>
      </div>

      {ffmpegLoading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={20} />
          <span className="text-blue-800 text-sm">Loading video compression engine...</span>
        </div>
      )}

      <div className="mb-6 bg-white rounded-xl border-2 border-neutral-200 p-6">
        <label className="block text-sm font-bold text-black mb-3">Compression Level</label>
        <div className="grid grid-cols-3 gap-3">
          {(['low', 'medium', 'hard'] as CompressionLevel[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              disabled={processing}
              className={`p-4 rounded-lg border-2 transition-all ${
                level === l
                  ? 'border-black bg-black text-white'
                  : 'border-neutral-200 bg-white text-black hover:border-neutral-400'
              } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="font-bold text-lg mb-1 uppercase">{l}</div>
              <div className={`text-xs ${level === l ? 'text-neutral-300' : 'text-neutral-600'}`}>
                {l === 'low' && 'High quality, larger size'}
                {l === 'medium' && 'Balanced quality & size'}
                {l === 'hard' && 'Fast loading, smaller size'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`mb-6 p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
          isDragActive
            ? 'border-black bg-neutral-50'
            : processing
            ? 'border-neutral-300 bg-neutral-100 cursor-not-allowed'
            : 'border-neutral-300 bg-white hover:border-black hover:bg-neutral-50'
        }`}
      >
        <input {...getInputProps()} disabled={processing} />
        <div className="flex flex-col items-center text-center">
          {processing ? (
            <>
              <Loader2 className="animate-spin text-black mb-4" size={48} />
              <p className="text-black font-bold mb-2">Processing...</p>
              <p className="text-neutral-600 text-sm">{status}</p>
            </>
          ) : (
            <>
              <Upload className="text-neutral-400 mb-4" size={48} />
              <p className="text-black font-bold mb-2">
                {isDragActive ? 'Drop file here' : 'Drag & drop media file here'}
              </p>
              <p className="text-neutral-600 text-sm">or click to browse (images and videos only)</p>
            </>
          )}
        </div>
      </div>

      {error && !result && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-amber-800 text-sm">
            <p className="font-bold mb-1">Notice</p>
            <p>{error}</p>
            {!ffmpegLoaded && <p className="mt-2 text-xs text-amber-700">Image compression is still fully available.</p>}
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border-2 border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-200 bg-green-50">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-bold text-black mb-1">Compression Complete!</h3>
                <p className="text-neutral-600 text-sm">{result.filename}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border border-neutral-200">
                <div className="text-xs text-neutral-600 mb-1">Original Size</div>
                <div className="text-lg font-bold text-black">{formatSize(result.originalSize)}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-neutral-200">
                <div className="text-xs text-neutral-600 mb-1">Compressed Size</div>
                <div className="text-lg font-bold text-green-600">{formatSize(result.compressedSize)}</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-neutral-200">
                <div className="text-xs text-neutral-600 mb-1">Saved</div>
                <div className="text-lg font-bold text-green-600">{getCompressionRatio()}%</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 bg-neutral-100 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
              {result.type === 'image' ? (
                <img src={result.url} alt="Compressed preview" className="max-w-full max-h-96 object-contain" />
              ) : (
                <video src={result.url} controls className="max-w-full max-h-96" />
              )}
            </div>

            <a
              href={result.url}
              download={`compressed_${level}_${result.filename}`}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 transition-colors"
            >
              <Download size={20} />
              Download Compressed File
            </a>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-neutral-50 rounded-xl border border-neutral-200">
        <h4 className="font-bold text-black mb-3 flex items-center gap-2">
          <FileImage size={18} />
          Compression Guide
        </h4>
        <ul className="space-y-2 text-sm text-neutral-700">
          <li className="flex gap-2">
            <span className="font-bold">Low:</span>
            <span>Best for high-quality portfolios. Images up to 2MB, 1080p videos.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">Medium:</span>
            <span>Balanced option. Images up to 1MB, 720p videos. Recommended for most uses.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">Hard:</span>
            <span>Maximum compression. Images up to 100KB, 480p videos. Ultra-fast loading.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
