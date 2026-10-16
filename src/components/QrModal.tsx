import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: string;
  subtitle?: string;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, title, data, subtitle }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <QrCode className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>

        {subtitle && (
          <p className="text-xs text-slate-400 mb-4">{subtitle}</p>
        )}

        {/* QR Code Container with High Contrast */}
        <div className="bg-white p-4 rounded-xl flex items-center justify-center mx-auto my-4 shadow-inner max-w-[240px]">
          <QRCodeSVG
            value={data || ''}
            size={208}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Data Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 my-4">
          <p className="text-xs font-mono text-slate-300 break-all max-h-24 overflow-y-auto custom-scrollbar select-all">
            {data}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium text-xs flex items-center justify-center gap-2 hover:bg-amber-500/20 active:scale-[0.98] transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '已复制到剪贴板' : '复制数据文本'}</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 active:scale-[0.98] transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
