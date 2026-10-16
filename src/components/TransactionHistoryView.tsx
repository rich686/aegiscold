import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Send,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { WatchOnlyWalletItem } from '../types/watchWallet.ts';
import { GeneratedAddressRecord } from '../types/addressRecord.ts';

interface TransactionHistoryViewProps {
  balanceSat: number;
  currentAddress: string;
  wallets: WatchOnlyWalletItem[];
  addressRecords: GeneratedAddressRecord[];
  onDeleteAddressRecord: (id: string) => void;
  onSelectActiveAddress: (record: GeneratedAddressRecord) => void;
  onInitiateSend: (address: string) => void;
  defaultSubTab?: 'records' | 'txs';
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  balanceSat,
  currentAddress,
  wallets,
  addressRecords,
  onDeleteAddressRecord,
  onSelectActiveAddress,
  onInitiateSend,
  defaultSubTab = 'records',
}) => {
  const [subTab, setSubTab] = useState<'records' | 'txs'>(defaultSubTab);
  const [ledgerFormat, setLedgerFormat] = useState<'bip49' | 'bip84' | 'bip44'>('bip49');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Mock combined transaction list derived from current wallet balance and watch wallets
  const transactions = [
    {
      id: 'tx-1',
      type: 'receive',
      amountSat: 100000,
      timestamp: Date.now() - 3600000 * 2,
      txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
      confirmations: 6,
      address: currentAddress,
      note: '沙盒冷端测试金注入',
    },
    {
      id: 'tx-2',
      type: 'receive',
      amountSat: 15420000,
      timestamp: Date.now() - 86400000 * 3,
      txid: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      confirmations: 432,
      address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      note: '定投存入 (BIP49 3开头金库)',
    },
    {
      id: 'tx-3',
      type: 'send',
      amountSat: 500000,
      timestamp: Date.now() - 86400000 * 7,
      txid: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
      confirmations: 1008,
      address: '347N1Thc213QqfYCz3PZafpausefqic3R5',
      note: '多重签名隔离见证花费',
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <History className="w-4 h-4 text-amber-400" />
            <span>台账与历史记录</span>
          </h2>
          <p className="text-[11px] text-slate-400">本地离线保存生成地址台账 · 严格单键删除</p>
        </div>

        <button
          onClick={() => onInitiateSend(currentAddress)}
          className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>快速转账</span>
        </button>
      </div>

      {/* Segmented Controller: [ 生成地址台账 (N) ] / [ 交易流水记录 ] */}
      <div className="grid grid-cols-2 p-1 bg-[#121826] border border-slate-800/80 rounded-2xl gap-1">
        <button
          onClick={() => setSubTab('records')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            subTab === 'records'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>已生成地址台账</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              subTab === 'records' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {addressRecords.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('txs')}
          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            subTab === 'txs'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>链上交易流水</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              subTab === 'txs' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {transactions.length}
          </span>
        </button>
      </div>

      {/* SubTab 1: Generated Address Records with SINGLE Delete Button */}
      {subTab === 'records' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span>记录每次生成的地址及私钥索引</span>
            <span className="text-[11px] text-slate-500">共 {addressRecords.length} 条</span>
          </div>

          {/* Address format toggle matching user screenshot */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#121826] border border-slate-800 rounded-xl">
            <button
              onClick={() => setLedgerFormat('bip49')}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all text-center cursor-pointer ${
                ledgerFormat === 'bip49'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/60 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>BIP49 (3...)</span>
            </button>
            <button
              onClick={() => setLedgerFormat('bip84')}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all text-center cursor-pointer ${
                ledgerFormat === 'bip84'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/60 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>BIP84 (bc1q)</span>
            </button>
            <button
              onClick={() => setLedgerFormat('bip44')}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all text-center cursor-pointer ${
                ledgerFormat === 'bip44'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/60 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>BIP44 (1...)</span>
            </button>
          </div>

          {addressRecords.length === 0 ? (
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs">暂无历史生成记录</p>
              <p className="text-[11px] text-slate-500">在主页点击「随机新地址」可即时生成并记录</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {addressRecords.map((rec) => {
                const targetAddress =
                  ledgerFormat === 'bip84'
                    ? rec.addressBech32 || rec.addressP2SH
                    : ledgerFormat === 'bip44'
                    ? rec.addressLegacy || rec.addressP2SH
                    : rec.addressP2SH;
                const isCurrent = currentAddress === rec.addressP2SH || currentAddress === targetAddress;

                return (
                  <div
                    key={rec.id}
                    className={`bg-[#0f172a] border rounded-2xl p-3.5 shadow-sm transition-colors ${
                      isCurrent
                        ? 'border-amber-500/50 bg-amber-500/5 shadow-amber-500/5'
                        : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Index, Path, Time */}
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          #{rec.index}
                        </span>
                        <span className="text-slate-400 truncate max-w-[150px]">{rec.path}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(rec.createdAt).toLocaleDateString([], {
                            month: 'numeric',
                            day: 'numeric',
                          })}{' '}
                          {new Date(rec.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Address String */}
                    <div className="font-mono text-xs text-amber-300 break-all select-all font-semibold my-1.5 bg-[#060b14] p-2 rounded-xl border border-slate-900">
                      {targetAddress}
                    </div>

                    {/* Action Row: Left: Set Active Status; Right: Copy & ONLY ONE Delete Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/70 text-xs">
                      <div>
                        {isCurrent ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>当前主收款地址</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => onSelectActiveAddress(rec)}
                            className="text-amber-400 hover:text-amber-300 text-[11px] font-medium transition-colors cursor-pointer hover:underline"
                          >
                            设为主收款地址
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(targetAddress, rec.id)}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="复制地址"
                        >
                          {copiedId === rec.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === rec.id ? '已复制' : '复制'}</span>
                        </button>

                        {/* ONLY ONE Single Delete Button per item as requested */}
                        <button
                          onClick={() => onDeleteAddressRecord(rec.id)}
                          className="px-2.5 py-1 rounded-xl bg-rose-950/30 hover:bg-rose-950/70 border border-rose-900/40 text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="删除此地址记录"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>删除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: On-chain Transaction History */}
      {subTab === 'txs' && (
        <div className="space-y-2.5">
          {transactions.map((tx) => {
            const isReceive = tx.type === 'receive';
            const btc = (tx.amountSat / 100_000_000).toFixed(8);

            return (
              <div
                key={tx.id}
                className="bg-[#0f172a] border border-slate-800/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                      isReceive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isReceive ? (
                      <ArrowDownLeft className="w-4 h-4 stroke-[2.2]" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 stroke-[2.2]" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>{isReceive ? '收到比特币' : '转出比特币'}</span>
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-1.5 rounded">
                        {tx.confirmations} 确认
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-[170px]">
                      {tx.address.slice(0, 10)}...{tx.address.slice(-6)}
                    </div>
                    <div className="text-[10px] text-slate-500">{tx.note}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-xs font-mono font-bold tabular-nums ${
                      isReceive ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {isReceive ? '+' : '-'}
                    {btc} BTC
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {tx.amountSat.toLocaleString()} sats
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
