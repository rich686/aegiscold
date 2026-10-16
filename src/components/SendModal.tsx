import React, { useState } from 'react';
import { X, Send, Zap, AlertCircle } from 'lucide-react';
import { DEFAULT_FEE_PRESETS } from '../crypto/feeEstimator.ts';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderAddress: string;
  senderBalanceSat: number;
  onConfirmSend: (toAddress: string, amountSat: number, feeSat: number) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  senderAddress,
  senderBalanceSat,
  onConfirmSend,
}) => {
  const [recipient, setRecipient] = useState('');
  const [amountBtc, setAmountBtc] = useState('');
  const [selectedFeeTier, setSelectedFeeTier] = useState<number>(18); // sat/vB
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Estimate fee based on ~140 vBytes typical transaction
  const estFeeSat = Math.max(140 * selectedFeeTier, 1000);
  const estFeeBtc = (estFeeSat / 100_000_000).toFixed(8);

  const parsedAmountSat = Math.round((parseFloat(amountBtc) || 0) * 100_000_000);
  const totalDeductionSat = parsedAmountSat + estFeeSat;
  const isBalanceSufficient = senderBalanceSat >= totalDeductionSat;

  const handleMaxClick = () => {
    const maxSat = Math.max(0, senderBalanceSat - estFeeSat);
    setAmountBtc((maxSat / 100_000_000).toFixed(8));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanRecipient = recipient.trim();
    if (!cleanRecipient) {
      setErrorMsg('请输入接收方比特币地址 (3... / bc1q... / 1...)');
      return;
    }
    if (parsedAmountSat <= 0) {
      setErrorMsg('转账金额必须大于 0');
      return;
    }
    if (!isBalanceSufficient) {
      setErrorMsg(`可用余额不足：当前余额 ${(senderBalanceSat / 100_000_000).toFixed(8)} BTC，所需总额 ${(totalDeductionSat / 100_000_000).toFixed(8)} BTC (含手续费)`);
      return;
    }

    onConfirmSend(cleanRecipient, parsedAmountSat, estFeeSat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">发起比特币转账</h3>
            <p className="text-[11px] text-slate-400">从 3 开头金库地址快速支付</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sender Source Notice */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 text-xs">
            <span className="text-slate-500 block mb-0.5 text-[11px]">扣款主地址 (扣除 UTXO):</span>
            <p className="font-mono text-amber-300 truncate font-semibold">{senderAddress}</p>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>当前可用余额:</span>
              <span className="font-mono text-white tabular-nums">
                {(senderBalanceSat / 100_000_000).toFixed(8)} BTC
              </span>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">接收方地址 (To Address)</label>
            <input
              type="text"
              required
              placeholder="3... 或 bc1q... 或 1..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>转账金额 (Amount BTC)</span>
              <button
                type="button"
                onClick={handleMaxClick}
                className="text-amber-400 text-[11px] font-semibold hover:underline"
              >
                最大可用 (Max)
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="0.00000000"
                value={amountBtc}
                onChange={(e) => setAmountBtc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 pr-14"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-mono text-slate-500">
                BTC
              </span>
            </div>
            {parsedAmountSat > 0 && (
              <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                ≈ {parsedAmountSat.toLocaleString()} sats
              </span>
            )}
          </div>

          {/* Fee Tiers */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>矿工费率 (Sat/vB)</span>
              <span className="font-mono text-amber-400">{estFeeSat} sats (≈ {estFeeBtc} BTC)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_FEE_PRESETS.slice(0, 3).map((tier) => {
                const isSelected = selectedFeeTier === tier.satPerVbyte;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedFeeTier(tier.satPerVbyte)}
                    className={`py-2 px-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{tier.label}</span>
                      <Zap className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                    <div className="text-[11px] font-mono mt-0.5">{tier.satPerVbyte} sat/vB</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>确认转账</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
