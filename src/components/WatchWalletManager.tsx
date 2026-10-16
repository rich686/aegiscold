import React, { useState } from 'react';
import {
  WatchOnlyWalletItem,
  saveWatchWallets
} from '../types/watchWallet.ts';
import {
  Eye,
  Plus,
  Trash2,
  QrCode,
  Copy,
  Check,
  Send,
  Download,
  Upload,
  Coins,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { QrModal } from './QrModal.tsx';

interface WatchWalletManagerProps {
  wallets: WatchOnlyWalletItem[];
  onWalletsChange: (wallets: WatchOnlyWalletItem[]) => void;
  onInitiateTx: (address: string, utxoTxid?: string, utxoAmountSat?: number) => void;
}

export const WatchWalletManager: React.FC<WatchWalletManagerProps> = ({
  wallets,
  onWalletsChange,
  onInitiateTx,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // New Wallet form
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newType, setNewType] = useState<WatchOnlyWalletItem['type']>('p2sh');
  const [newDerivation, setNewDerivation] = useState("m/49'/0'/0'/0/0");
  const [newBalanceBtc, setNewBalanceBtc] = useState('0.00000000');
  const [formError, setFormError] = useState<string | null>(null);

  // Expanded UTXO rows
  const [expandedWalletIds, setExpandedWalletIds] = useState<Record<string, boolean>>({});

  // UI helpers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{ title: string; data: string; subtitle?: string } | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const toggleExpand = (id: string) => {
    setExpandedWalletIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Add Watch Wallet
  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const addr = newAddress.trim();
    if (!addr) {
      setFormError('请输入比特币钱包地址或 xpub/ypub/zpub 扩展公钥');
      return;
    }

    // Auto-detect type if address starts with 3
    let detectedType = newType;
    if (addr.startsWith('3')) {
      detectedType = 'p2sh';
    } else if (addr.startsWith('bc1q')) {
      detectedType = 'segwit';
    } else if (addr.startsWith('1')) {
      detectedType = 'legacy';
    }

    const sat = Math.round((parseFloat(newBalanceBtc) || 0) * 100_000_000);

    const newItem: WatchOnlyWalletItem = {
      id: 'watch-' + Date.now(),
      label: newLabel.trim() || `观察金库 ${wallets.length + 1}`,
      addressOrXpub: addr,
      type: detectedType,
      derivationPath: newDerivation.trim() || undefined,
      balanceSat: sat,
      createdAt: Date.now(),
      notes: '手动添加的离线观察目标',
      utxos: sat > 0 ? [
        {
          id: 'utxo-' + Date.now(),
          txid: '3c8e' + Math.random().toString(16).slice(2).padStart(60, '0'),
          vout: 0,
          amountSat: sat,
          confirmed: true,
        }
      ] : [],
    };

    const updated = [newItem, ...wallets];
    onWalletsChange(updated);
    saveWatchWallets(updated);

    // Reset & close
    setNewLabel('');
    setNewAddress('');
    setNewBalanceBtc('0.00000000');
    setIsAddModalOpen(false);
  };

  // Delete Watch Wallet
  const handleDeleteConfirm = (id: string) => {
    const updated = wallets.filter((w) => w.id !== id);
    onWalletsChange(updated);
    saveWatchWallets(updated);
    setDeleteCandidateId(null);
  };

  // Export JSON
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(wallets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-watch-wallets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onWalletsChange(parsed);
          saveWatchWallets(parsed);
        }
      } catch {
        alert('无法解析该 JSON 格式');
      }
    };
    reader.readAsText(file);
  };

  // Total balance sum
  const totalBalanceSat = wallets.reduce((acc, w) => acc + w.balanceSat, 0);
  const totalBalanceBtc = (totalBalanceSat / 100_000_000).toFixed(8);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>观察钱包管理 (Watch-Only Wallets)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            仅保存公钥与 3 开头地址 · 零私钥泄露风险 · 监控链上余额与生成离线未签名交易
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>添加观察钱包</span>
          </button>

          <button
            onClick={handleExportJSON}
            title="导出备份 JSON"
            className="h-10 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导出备份</span>
          </button>

          <label
            title="导入备份 JSON"
            className="h-10 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导入</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">观察钱包总资产</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">{totalBalanceBtc}</span>
            <span className="text-xs text-amber-400 font-semibold">BTC</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {totalBalanceSat.toLocaleString()} Satoshis
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">托管地址总数</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">{wallets.length}</span>
            <span className="text-xs text-slate-500">个冷金库</span>
          </div>
          <span className="text-[11px] text-emerald-400">
            全部以只读权限保存在本地
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">3 开头隔离见证地址占比</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {wallets.filter((w) => w.type === 'p2sh' || w.type === 'multisig').length}
            </span>
            <span className="text-xs text-slate-500">/ {wallets.length}</span>
          </div>
          <span className="text-[11px] text-slate-500">
            享受最高约 38% 交易手续费优惠
          </span>
        </div>
      </div>

      {/* Wallets List */}
      <div className="space-y-4">
        {wallets.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <Eye className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-300 font-medium">暂无观察钱包</p>
            <p className="text-xs text-slate-500 mt-1">
              点击上方“添加观察钱包”按钮，或在密钥生成页面将生成的 3 开头地址一键导入
            </p>
          </div>
        ) : (
          wallets.map((wallet) => {
            const isExpanded = !!expandedWalletIds[wallet.id];
            const isP2SH = wallet.type === 'p2sh' || wallet.addressOrXpub.startsWith('3');

            return (
              <div
                key={wallet.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{wallet.label}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      isP2SH
                        ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                        : 'text-slate-400 bg-slate-800'
                    }`}>
                      {wallet.type.toUpperCase()}
                    </span>
                    {wallet.derivationPath && (
                      <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                        {wallet.derivationPath}
                      </span>
                    )}
                  </div>

                  {/* Actions: Delete & Send */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onInitiateTx(
                          wallet.addressOrXpub,
                          wallet.utxos[0]?.txid,
                          wallet.utxos[0]?.amountSat
                        )
                      }
                      className="py-1 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>制作未签名交易</span>
                    </button>

                    <button
                      onClick={() => setDeleteCandidateId(wallet.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                      title="删除此观察钱包"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Address block */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-mono text-xs sm:text-sm text-slate-200 break-all select-all">
                    {wallet.addressOrXpub}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleCopy(wallet.addressOrXpub, `copy-${wallet.id}`)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === `copy-${wallet.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === `copy-${wallet.id}` ? '已复制' : '复制'}</span>
                    </button>

                    <button
                      onClick={() =>
                        setQrModalData({
                          title: wallet.label,
                          data: wallet.addressOrXpub,
                          subtitle: '比特币收款观察地址',
                        })
                      }
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>二维码</span>
                    </button>
                  </div>
                </div>

                {/* Balance & UTXO footer */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>资产余额:</span>
                      <span className="font-mono text-white font-bold tabular-nums">
                        {(wallet.balanceSat / 100_000_000).toFixed(8)} BTC
                      </span>
                    </div>

                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500 font-mono">
                      {wallet.utxos.length} 笔 UTXO
                    </span>
                  </div>

                  {wallet.utxos.length > 0 && (
                    <button
                      onClick={() => toggleExpand(wallet.id)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <span>{isExpanded ? '收起 UTXO' : '展开 UTXO'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* UTXO Accordion */}
                {isExpanded && wallet.utxos.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                    {wallet.utxos.map((u) => (
                      <div
                        key={u.id}
                        className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <div className="truncate max-w-sm text-slate-400">
                          <span className="text-slate-500">TXID: </span>
                          <span className="text-slate-300">{u.txid.slice(0, 16)}...{u.txid.slice(-8)}</span>
                          <span className="text-amber-400 ml-1">:{u.vout}</span>
                        </div>
                        <div className="text-emerald-400 font-semibold tabular-nums">
                          +{(u.amountSat / 100_000_000).toFixed(8)} BTC ({u.amountSat.toLocaleString()} sat)
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Wallet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-3">添加新的观察钱包</h3>
            <p className="text-xs text-slate-400 mb-4">
              输入任意 3 开头或兼容的比特币地址进行离线监控与未签名交易编排。
            </p>

            <form onSubmit={handleAddWallet} className="space-y-4">
              {formError && (
                <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-2.5 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 block mb-1">金库名称 / 标签</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 手机冷端 01 (BIP49)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">比特币地址 或 xpub/ypub/zpub</label>
                <input
                  type="text"
                  required
                  placeholder="3... 或 bc1q... 或 xpub..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">脚本类型</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as WatchOnlyWalletItem['type'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200"
                  >
                    <option value="p2sh">BIP49 P2SH (3...)</option>
                    <option value="segwit">BIP84 SegWit (bc1q)</option>
                    <option value="multisig">多重签名 (3...)</option>
                    <option value="legacy">Legacy (1...)</option>
                    <option value="xpub">Extended Public Key</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">初始模拟余额 (BTC)</label>
                  <input
                    type="text"
                    value={newBalanceBtc}
                    onChange={(e) => setNewBalanceBtc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">派生路径备忘 (选填)</label>
                <input
                  type="text"
                  value={newDerivation}
                  onChange={(e) => setNewDerivation(e.target.value)}
                  placeholder="m/49'/0'/0'/0/0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  确认添加
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-900/60 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold">确认删除观察钱包？</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              此操作将从本机的观察列表中移除此地址记录。不会影响区块链上的实际资产与链下冷私钥。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteConfirm(deleteCandidateId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                确认删除
              </button>
              <button
                onClick={() => setDeleteCandidateId(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModalData && (
        <QrModal
          isOpen={!!qrModalData}
          onClose={() => setQrModalData(null)}
          title={qrModalData.title}
          data={qrModalData.data}
          subtitle={qrModalData.subtitle}
        />
      )}
    </div>
  );
};
