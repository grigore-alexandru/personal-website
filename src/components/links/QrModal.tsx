'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { SplitButton } from '../ui/SplitButton';
import { shortLinkFor } from './ShortLinkDisplay';
import type { Link } from '../../types/links';

interface QrModalProps {
  open: boolean;
  link: Link | null;
  onClose: () => void;
  onToast: (type: 'success' | 'error', message: string) => void;
}

const PREVIEW_SIZE = 260;
const EXPORT_SIZE = 1024;

export function QrModal({ open, link, onClose, onToast }: QrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transparent, setTransparent] = useState(false);
  const [background, setBackground] = useState('#ffffff');
  const [foreground, setForeground] = useState('#000000');

  const url = link ? shortLinkFor(link.slug) : '';

  // 8-digit hex: the qrcode library takes RGBA, and '00' alpha is how a
  // transparent background is expressed.
  const colorOptions = useCallback(
    () => ({
      dark: `${foreground}ff`,
      light: transparent ? '#00000000' : `${background}ff`,
    }),
    [foreground, background, transparent]
  );

  useEffect(() => {
    if (!open || !link || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, url, {
      width: PREVIEW_SIZE,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: colorOptions(),
    }).catch(() => onToast('error', 'Could not render the QR code'));
  }, [open, link, url, colorOptions, onToast]);

  const filename = (ext: string) => `${link?.slug ?? 'link'}-qr.${ext}`;

  const renderPng = async (): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, url, {
      width: EXPORT_SIZE,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: colorOptions(),
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))), 'image/png');
    });
  };

  const renderSvg = async (): Promise<string> =>
    QRCode.toString(url, {
      type: 'svg',
      width: EXPORT_SIZE,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: colorOptions(),
    });

  const saveBlob = (blob: Blob, name: string) => {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  const downloadPng = async () => {
    try {
      saveBlob(await renderPng(), filename('png'));
      onToast('success', 'PNG downloaded');
    } catch {
      onToast('error', 'Could not export the PNG');
    }
  };

  const downloadSvg = async () => {
    try {
      saveBlob(new Blob([await renderSvg()], { type: 'image/svg+xml' }), filename('svg'));
      onToast('success', 'SVG downloaded');
    } catch {
      onToast('error', 'Could not export the SVG');
    }
  };

  const copyPng = async () => {
    try {
      const blob = await renderPng();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      onToast('success', 'PNG copied to clipboard');
    } catch {
      onToast('error', 'Clipboard image copy was blocked — download instead');
    }
  };

  const copySvg = async () => {
    try {
      await navigator.clipboard.writeText(await renderSvg());
      onToast('success', 'SVG markup copied to clipboard');
    } catch {
      onToast('error', 'Clipboard access was blocked — download instead');
    }
  };

  if (!link) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="QR code"
      subtitle={url}
      footer={
        <div className="flex justify-end">
          <SplitButton
            label="Download PNG"
            icon={<Download size={16} />}
            onClick={downloadPng}
            direction="up"
            items={[
              { label: 'Download PNG', icon: <Download size={15} />, onClick: downloadPng },
              { label: 'Download SVG', icon: <Download size={15} />, onClick: downloadSvg },
              { label: 'Copy as PNG', icon: <Copy size={15} />, onClick: copyPng },
              { label: 'Copy as SVG', icon: <Copy size={15} />, onClick: copySvg },
            ]}
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-start">
        <div
          className="rounded-lg border border-neutral-200 p-3 justify-self-center"
          // The checkerboard makes a transparent background legible instead of
          // looking like a white one.
          style={
            transparent
              ? {
                  backgroundImage:
                    'linear-gradient(45deg,#e5e5e5 25%,transparent 25%),linear-gradient(-45deg,#e5e5e5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e5e5 75%),linear-gradient(-45deg,transparent 75%,#e5e5e5 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0px',
                }
              : undefined
          }
        >
          <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} className="block" />
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-black">Transparent background</p>
              <p className="text-xs text-neutral-500">Best for printing over artwork</p>
            </div>
            <ToggleSwitch
              checked={transparent}
              onChange={() => setTransparent(!transparent)}
              ariaLabel="Toggle transparent background"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <label htmlFor="qr-bg" className="text-sm font-medium text-black">
              Background colour
            </label>
            <input
              id="qr-bg"
              type="color"
              value={background}
              disabled={transparent}
              onChange={(e) => setBackground(e.target.value)}
              className="w-14 h-9 rounded-lg border border-neutral-300 bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <label htmlFor="qr-fg" className="text-sm font-medium text-black">
              QR colour
            </label>
            <input
              id="qr-fg"
              type="color"
              value={foreground}
              onChange={(e) => setForeground(e.target.value)}
              className="w-14 h-9 rounded-lg border border-neutral-300 bg-white cursor-pointer"
            />
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed border-t border-neutral-200 pt-4">
            Keep strong contrast between the two colours, and test the printed code before
            ordering a batch — light modules on a dark background fail on some scanners.
          </p>

        </div>
      </div>
    </Modal>
  );
}
