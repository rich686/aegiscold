import React, { useState } from 'react';
import {
  Settings,
  Users,
  Coins,
  Lock,
  FileCheck,
  Eye,
  ChevronRight,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { FeeEstimator } from './FeeEstimator.tsx';
import { MultisigManager } from './MultisigManager.tsx';
import { OneWayProof } from './OneWayProof.tsx';
import { AuditView } from './AuditView.tsx';
import { WatchWalletManager } from './WatchWalletManager.tsx';
import { WatchOnlyWalletItem } from '../types/watchWallet.ts';

interface AdvancedSettingsViewProps {
  wallets: WatchOnlyWalletItem[];
  onWalletsChange: (wallets: WatchOnlyWalletItem[]) => void;
  onAddToWatch: (item: Omit<WatchOnlyWalletItem, 'id' | 'createdAt'>) => void;
  onInitiateTx: (address: string) => void;
}

export const AdvancedSettingsView: React.FC<AdvancedSettingsViewProps> = ({
  wallets,
  onWalletsChange,
  onAddToWatch,
  onInitiateTx,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    'menu' | 'fee' | 'multisig' | 'oneway' | 'audit' | 'watch'
  >('menu');

  if (activeSubView === 'fee') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSubView('menu')}
          className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          ← 返回设置与工具菜单
        </button>
        <FeeEstimator />
      </div>
    );
  }

  if (activeSubView === 'multisig') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSubView('menu')}
          className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          ← 返回设置与工具菜单
        </button>
        <MultisigManager onAddToWatch={onAddToWatch} />
      </div>
    );
  }

  if (activeSubView === 'oneway') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSubView('menu')}
          className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          ← 返回设置与工具菜单
        </button>
        <OneWayProof />
      </div>
    );
  }

  if (activeSubView === 'audit') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSubView('menu')}
          className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          ← 返回设置与工具菜单
        </button>
        <AuditView />
      </div>
    );
  }

  if (activeSubView === 'watch') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveSubView('menu')}
          className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          ← 返回设置与工具菜单
        </button>
        <WatchWalletManager
          wallets={wallets}
          onWalletsChange={onWalletsChange}
          onInitiateTx={onInitiateTx}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in">
      <div className="pb-3 border-b border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-amber-400" />
          <span>系统工具与高级设置</span>
        </h2>
        <p className="text-[11px] text-slate-400">密码学审计 · 多签验证 · 费率模型 · 观察管理</p>
      </div>

      <div className="space-y-2">
        {/* Watch Wallet Manager */}
        <button
          onClick={() => setActiveSubView('watch')}
          className="w-full p-4 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] border border-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">观察钱包管理 (添加/删除)</span>
              <span className="text-[11px] text-slate-400">
                管理只读金库 ({wallets.length} 个地址) 与未签名交易
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Fee Estimator */}
        <button
          onClick={() => setActiveSubView('fee')}
          className="w-full p-4 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] border border-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">交易费率估算模块</span>
              <span className="text-[11px] text-slate-400">
                vByte 精确建模 · 3 开头隔离见证省费约 38%
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Multisig Manager */}
        <button
          onClick={() => setActiveSubView('multisig')}
          className="w-full p-4 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] border border-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">多重签名验证逻辑 (Multisig P2SH)</span>
              <span className="text-[11px] text-slate-400">
                生成 3 开头多签地址 · BIP67 字典序 · 门限签名核验
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* One Way Proof */}
        <button
          onClick={() => setActiveSubView('oneway')}
          className="w-full p-4 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] border border-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">单向哈希证明：地址推导不出公钥</span>
              <span className="text-[11px] text-slate-400">
                SHA-256 与 RIPEMD-160 有损压缩陷门原像抗性解析
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Audit View */}
        <button
          onClick={() => setActiveSubView('audit')}
          className="w-full p-4 rounded-2xl bg-[#0f172a] hover:bg-[#1a2336] border border-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">开源审计与 BIP 标准测试向量</span>
              <span className="text-[11px] text-slate-400">
                在当前安卓设备实机运行 BIP39/BIP49 官方测试用例
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-2xl text-[11px] text-slate-500 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500/70 shrink-0" />
        <span>建议在 Android 离线手机永久关闭网络，通过气隙二维码与热端轻钱包配合使用。</span>
      </div>
    </div>
  );
};
