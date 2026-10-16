import React from 'react';
import { X, Check, Wallet, Plus, Shield } from 'lucide-react';
import { WatchOnlyWalletItem } from '../types/watchWallet.ts';

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWalletId: string;
  onSelectWallet: (id: string) => void;
  watchWallets: WatchOnlyWalletItem[];
  onAddNewWallet: () => void;
}

export const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isOpen,
  onClose,
  activeWalletId,
  onSelectWallet,
  watchWallets,
  onAddNewWallet,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-1">切换冷金库与钱包</h3>
        <p className="text-[11px] text-slate-400 mb-4">选择当前主控钱包或观察地址</p>

        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
          {/* Default generated wallet */}
          <button
            onClick={() => {
              onSelectWallet('primary-cold');
              onClose();
            }}
            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
              activeWalletId === 'primary-cold'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                ₿
              </div>
              <div>
                <span className="text-xs font-bold text-white block">默认比特币冷端主钱包</span>
                <span className="text-[10px] text-slate-400 font-mono">BIP49 P2SH (3...) · 本地签名</span>
              </div>
            </div>
            {activeWalletId === 'primary-cold' && <Check className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Watch-only wallets */}
          {watchWallets.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                onSelectWallet(w.id);
                onClose();
              }}
              className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                activeWalletId === w.id
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center text-xs">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{w.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(w.balanceSat / 100_000_000).toFixed(6)} BTC · {w.type.toUpperCase()}
                  </span>
                </div>
              </div>
              {activeWalletId === w.id && <Check className="w-4 h-4 text-amber-400" />}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            onAddNewWallet();
            onClose();
          }}
          className="w-full mt-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>全新生成/添加新金库</span>
        </button>
      </div>
    </div>
  );
};
