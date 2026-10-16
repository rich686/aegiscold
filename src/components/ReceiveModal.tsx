import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, ShieldCheck, ArrowDownLeft } from 'lucide-react';
import { DerivedAddress } from '../crypto/bitcoin.ts';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: DerivedAddress | null;
  initialFormat?: 'bip49' | 'bip84' | 'bip44';
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  initialFormat = 'bip49',
}) => {
  const getFormatFromInitial = (f: 'bip49' | 'bip84' | 'bip44'): 'p2sh' | 'bech32' | 'legacy' => {
    if (f === 'bip84') return 'bech32';
    if (f === 'bip44') return 'legacy';
    return 'p2sh';
  };

  const [selectedFormat, setSelectedFormat] = useState<'p2sh' | 'bech32' | 'legacy'>(
    getFormatFromInitial(initialFormat)
  );
  const [copied, setCopied] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');

  // Sync format whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedFormat(getFormatFromInitial(initialFormat));
    }
  }, [isOpen, initialFormat]);

  if (!isOpen || !currentAddress) return null;

  const activeAddr =
    selectedFormat === 'p2sh'
      ? currentAddress.addressP2SH
      : selectedFormat === 'bech32'
      ? currentAddress.addressBech32
      : currentAddress.addressLegacy;

  const qrUri = requestAmount.trim()
    ? `bitcoin:${activeAddr}?amount=${requestAmount.trim()}`
    : activeAddr;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>
        <h3 className="text-base font-bold text-white">接收比特币</h3>
        <p className="text-[11px] text-slate-400 mb-3">支持所有交易所与轻钱包直接转入</p>

        {/* Address Format Switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800">
          <button
            onClick={() => setSelectedFormat('p2sh')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              selectedFormat === 'p2sh'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3 开头 (BIP49)
          </button>
          <button
            onClick={() => setSelectedFormat('bech32')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              selectedFormat === 'bech32'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            bc1q (原生)
          </button>
          <button
            onClick={() => setSelectedFormat('legacy')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              selectedFormat === 'legacy'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            1 开头 (传统)
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-inner my-1">
          <QRCodeSVG
            value={qrUri}
            size={190}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Address Box */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 my-3 text-left">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>{selectedFormat === 'p2sh' ? '★ BIP49 P2SH 兼容地址' : '收款地址'}</span>
            <span className="font-mono text-slate-500">#{currentAddress.index}</span>
          </div>
          <p className="font-mono text-xs text-amber-300 break-all select-all font-semibold">
            {activeAddr}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '已复制收款地址' : '复制收款地址'}</span>
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>单向哈希保护 · 真实公钥绝对隐匿</span>
        </div>
      </div>
    </div>
  );
};
