import React, { useState } from 'react';
import {
  ChevronDown,
  RotateCw,
  Copy,
  Check,
  QrCode,
  Send,
  ArrowDownLeft,
  KeyRound,
  Plus,
  Eye,
  Key,
  ExternalLink,
  Wifi,
  WifiOff,
  History,
  Sliders
} from 'lucide-react';
import { DerivedAddress } from '../crypto/bitcoin.ts';

export type AddressType = 'bip49' | 'bip84' | 'bip44';

interface WalletHomeProps {
  currentAddress: DerivedAddress | null;
  balanceSat: number;
  isOnline: boolean;
  walletName: string;
  addressRecordsCount: number;
  addressType: AddressType;
  onAddressTypeChange: (type: AddressType) => void;
  onOpenSend: () => void;
  onOpenReceive: () => void;
  onOpenKeyManagement: () => void;
  onOpenImport: () => void;
  onOpenAddWatch: () => void;
  onNewRandomAddress: () => void;
  onSwitchWalletModal: () => void;
  onViewAddressRecords: () => void;
}

export const WalletHome: React.FC<WalletHomeProps> = ({
  currentAddress,
  balanceSat,
  isOnline,
  walletName,
  addressRecordsCount,
  addressType,
  onAddressTypeChange,
  onOpenSend,
  onOpenReceive,
  onOpenKeyManagement,
  onOpenImport,
  onOpenAddWatch,
  onNewRandomAddress,
  onSwitchWalletModal,
  onViewAddressRecords,
}) => {
  const [copied, setCopied] = useState(false);

  // Exchange rate simulation (1 BTC ≈ 551,307 CNY)
  const BTC_CNY_RATE = 551307;
  const balanceBtc = (balanceSat / 100_000_000).toFixed(8);
  const balanceCny = ((balanceSat / 100_000_000) * BTC_CNY_RATE).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Determine active address based on user's chosen address type
  const getActiveAddress = () => {
    if (!currentAddress) return '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
    if (addressType === 'bip84') {
      return currentAddress.addressBech32 || currentAddress.addressP2SH;
    }
    if (addressType === 'bip44') {
      return currentAddress.addressLegacy || currentAddress.addressP2SH;
    }
    return currentAddress.addressP2SH;
  };

  const activeAddr = getActiveAddress();

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in select-none">
      {/* Top Header Status & Wallet Selector */}
      <div className="flex items-center justify-between gap-2 pt-1">
        {/* Wallet Dropdown Selector */}
        <button
          onClick={onSwitchWalletModal}
          className="flex items-center gap-2 bg-[#121826] hover:bg-[#1a2336] border border-slate-800/80 rounded-2xl px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm"
        >
          <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px]">
            ₿
          </div>
          <span className="truncate max-w-[120px]">{walletName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Network & Airgap Badges */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[#121826] border border-slate-800/80 rounded-2xl px-2.5 py-1.5 text-[11px] text-slate-400">
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-amber-400" />
                <span>在线</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">离线冷端</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#121826] border border-slate-800/80 rounded-2xl px-2.5 py-1.5 text-[11px] font-medium text-amber-400">
            <span className="text-cyan-400">🌐</span>
            <span>Mainnet</span>
          </div>

          {/* Key/Address book quick icon */}
          <button
            onClick={onOpenKeyManagement}
            className="w-8 h-8 rounded-2xl bg-[#121826] border border-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="密钥与路径管理"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Asset Balance Card */}
      <div className="bg-[#0f172a]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>比特币主资产</span>
            <RotateCw className="w-3 h-3 text-slate-500 cursor-pointer hover:rotate-180 transition-transform duration-500" />
          </div>
          <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium">
            1 BTC ≈ ¥{BTC_CNY_RATE.toLocaleString()}
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
            {balanceBtc}
          </span>
          <span className="text-sm font-bold text-amber-400 font-mono">BTC</span>
        </div>

        <div className="text-xs text-slate-400 font-mono flex items-center justify-between pt-1">
          <span>≈ ¥{balanceCny} CNY</span>
          <span className="text-slate-500">({balanceSat.toLocaleString()} sats)</span>
        </div>
      </div>

      {/* Current Main Receive Address Card (With user requested Address Type Selector) */}
      <div className="bg-[#0f172a]/95 border border-slate-800/90 rounded-3xl p-4 shadow-xl backdrop-blur-sm space-y-3">
        {/* Card Header & Title */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-200 font-semibold text-xs">
              当前主收款地址
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {addressType === 'bip49' && 'BIP49 3开头'}
              {addressType === 'bip84' && 'BIP84 bc1q原生'}
              {addressType === 'bip44' && 'BIP44 1开头传统'}
            </span>
          </div>

          <a
            href={`https://mempool.space/address/${activeAddr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300 flex items-center gap-0.5 text-[11px]"
          >
            <span>区块链查询</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Address String Display */}
        <div className="bg-[#060b14] border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="font-mono text-xs sm:text-[13px] text-amber-300 truncate select-all font-semibold">
            {activeAddr}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="复制当前格式地址"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onOpenReceive}
              className="p-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              title="显示收款二维码"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Address Type Selector (Matching Screenshot Design) */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1 font-medium">
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>选择相同助记词的展示地址种类:</span>
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              {addressType === 'bip49' && '3 开头推荐 BIP49'}
              {addressType === 'bip84' && '最低转账费率 (bc1q)'}
              {addressType === 'bip44' && '最高旧钱包兼容 (1...)'}
            </span>
          </div>

          {/* 3 Pill Selector Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {/* BIP49 (3...) */}
            <button
              type="button"
              onClick={() => onAddressTypeChange('bip49')}
              className={`py-2 px-1 rounded-xl text-xs font-mono transition-all text-center cursor-pointer ${
                addressType === 'bip49'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/70 font-bold shadow-md shadow-amber-500/10'
                  : 'bg-[#060b14] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <div className="font-bold text-[11px] sm:text-xs">BIP49</div>
              <div className="text-[10px] text-amber-300/80">(3...)</div>
            </button>

            {/* BIP84 (bc1q) */}
            <button
              type="button"
              onClick={() => onAddressTypeChange('bip84')}
              className={`py-2 px-1 rounded-xl text-xs font-mono transition-all text-center cursor-pointer ${
                addressType === 'bip84'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/70 font-bold shadow-md shadow-amber-500/10'
                  : 'bg-[#060b14] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <div className="font-bold text-[11px] sm:text-xs">BIP84</div>
              <div className="text-[10px] text-amber-300/80">(bc1q)</div>
            </button>

            {/* BIP44 (1...) */}
            <button
              type="button"
              onClick={() => onAddressTypeChange('bip44')}
              className={`py-2 px-1 rounded-xl text-xs font-mono transition-all text-center cursor-pointer ${
                addressType === 'bip44'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/70 font-bold shadow-md shadow-amber-500/10'
                  : 'bg-[#060b14] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <div className="font-bold text-[11px] sm:text-xs">BIP44</div>
              <div className="text-[10px] text-amber-300/80">(1...)</div>
            </button>
          </div>
        </div>

        {/* Derivation Path and Index Note */}
        {currentAddress?.path && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-900 px-0.5">
            <span>HD 路径: {currentAddress.path}</span>
            <span>序号 #{currentAddress.index}</span>
          </div>
        )}
      </div>

      {/* 3 Primary Action Buttons: Send, Receive, Key Management */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Send / Transfer */}
        <button
          onClick={onOpenSend}
          className="flex flex-col items-center justify-center p-3 rounded-3xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/15 cursor-pointer min-h-[76px]"
        >
          <Send className="w-5 h-5 mb-1 stroke-[2.2]" />
          <span className="text-xs">转账</span>
        </button>

        {/* Receive */}
        <button
          onClick={onOpenReceive}
          className="flex flex-col items-center justify-center p-3 rounded-3xl bg-[#0f172a] hover:bg-[#1a2336] active:scale-95 border border-slate-800 text-slate-200 transition-all shadow-md cursor-pointer min-h-[76px]"
        >
          <ArrowDownLeft className="w-5 h-5 mb-1 text-emerald-400 stroke-[2.2]" />
          <span className="text-xs font-medium">收款</span>
        </button>

        {/* Key Management */}
        <button
          onClick={onOpenKeyManagement}
          className="flex flex-col items-center justify-center p-3 rounded-3xl bg-[#0f172a] hover:bg-[#1a2336] active:scale-95 border border-slate-800 text-slate-200 transition-all shadow-md cursor-pointer min-h-[76px]"
        >
          <KeyRound className="w-5 h-5 mb-1 text-rose-400 stroke-[2.2]" />
          <span className="text-xs font-medium">私钥管理</span>
        </button>
      </div>

      {/* Secondary Quick Action Row (Capsule buttons) */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={onNewRandomAddress}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] active:scale-95 border border-slate-800/80 text-slate-300 text-xs font-medium transition-all cursor-pointer shadow-sm"
          title="生成下一个新地址并自动记入台账"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>随机新地址</span>
        </button>

        <button
          onClick={onOpenAddWatch}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] active:scale-95 border border-slate-800/80 text-slate-300 text-xs font-medium transition-all cursor-pointer shadow-sm"
          title="将当前收款地址加入观察钱包"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>加观察钱包</span>
        </button>

        <button
          onClick={onOpenImport}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] active:scale-95 border border-slate-800/80 text-slate-300 text-xs font-medium transition-all cursor-pointer shadow-sm"
          title="导入私钥或助记词"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>导入私钥</span>
        </button>
      </div>

      {/* Quick link button to View Generated Address Records (keeps home clean) */}
      <div className="pt-2">
        <button
          onClick={onViewAddressRecords}
          className="w-full py-2.5 px-4 rounded-2xl bg-[#0f172a]/60 hover:bg-[#0f172a] border border-slate-800/70 text-slate-400 hover:text-slate-200 text-xs flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>已生成历史地址记录台账</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full font-mono font-semibold">
              {addressRecordsCount} 个地址
            </span>
            <span className="text-slate-500 text-xs">查看 ›</span>
          </div>
        </button>
      </div>
    </div>
  );
};
