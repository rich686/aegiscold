import React from 'react';
import { ShieldCheck, Cpu } from 'lucide-react';

export type ActiveTab = 'keygen' | 'oneway' | 'signer' | 'multisig' | 'watch' | 'fee' | 'audit';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isOnline }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand title wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Cpu className="w-4 h-4" />
          </div>
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('keygen'); }} className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            AegisCold <span className="text-amber-400 font-mono text-sm">3.x</span>
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('keygen')}
            className={`whitespace-nowrap transition-colors ${activeTab === 'keygen' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            密钥与3开头地址
          </button>
          <button
            onClick={() => setActiveTab('signer')}
            className={`whitespace-nowrap transition-colors ${activeTab === 'signer' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            离线签名
          </button>
          <button
            onClick={() => setActiveTab('watch')}
            className={`whitespace-nowrap transition-colors ${activeTab === 'watch' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            观察钱包
          </button>
          <button
            onClick={() => setActiveTab('multisig')}
            className={`whitespace-nowrap transition-colors ${activeTab === 'multisig' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            多重签名验证
          </button>
          <button
            onClick={() => setActiveTab('fee')}
            className={`whitespace-nowrap transition-colors ${activeTab === 'fee' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            费率估算
          </button>
          <button
            onClick={() => setActiveTab('oneway')}
            className={`whitespace-nowrap transition-colors ${activeTab === 'oneway' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            单向哈希原理
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`whitespace-nowrap transition-colors ${activeTab === 'audit' ? 'text-amber-400 font-semibold' : 'hover:text-slate-200'}`}
          >
            开源审计
          </button>
        </nav>

        {/* Zone 3: Offline status indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">纯本地内存运行</span>
            <span className="text-slate-600">·</span>
            <span className={isOnline ? 'text-amber-300' : 'text-emerald-400 font-semibold'}>
              {isOnline ? '建议开启飞行模式' : '离线隔离正常'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Tab Scrollbar for Touch Accessibility */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto custom-scrollbar pt-2.5 pb-0.5 border-t border-slate-900/60 mt-2.5">
        {[
          { id: 'keygen', label: '密钥生成' },
          { id: 'signer', label: '离线签名' },
          { id: 'watch', label: '观察钱包' },
          { id: 'multisig', label: '多重签名' },
          { id: 'fee', label: '费率估算' },
          { id: 'oneway', label: '哈希原理' },
          { id: 'audit', label: '开源审计' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 bg-slate-900/60 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
