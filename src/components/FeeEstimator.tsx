import React, { useState } from 'react';
import {
  calculateTxFee,
  DEFAULT_FEE_PRESETS,
  InputScriptType,
  OutputScriptType,
} from '../crypto/feeEstimator.ts';
import {
  Zap,
  Clock,
  TrendingDown,
  Info,
  Scale
} from 'lucide-react';

export const FeeEstimator: React.FC = () => {
  const [inputCount, setInputCount] = useState<number>(1);
  const [inputType, setInputType] = useState<InputScriptType>('p2sh-p2wpkh');
  const [outputCount, setOutputCount] = useState<number>(2);
  const [outputType, setOutputType] = useState<OutputScriptType>('p2sh');
  const [satPerVbyte, setSatPerVbyte] = useState<number>(18);
  const [transferAmountBtc, setTransferAmountBtc] = useState<string>('0.05000000');

  const calculation = calculateTxFee(
    inputCount,
    inputType,
    outputCount,
    outputType,
    satPerVbyte
  );

  const transferSat = Math.round((parseFloat(transferAmountBtc) || 0) * 100_000_000);
  const feePercentOfTx = transferSat > 0 ? ((calculation.feeSat / transferSat) * 100).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>比特币交易费率估算与 SegWit 减费模块</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          基于 BIP141/BIP49 虚拟体积 (vByte) 精确建模 · 动态模拟内存池拥堵梯级 · 3 开头地址省费对比
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Transaction Sizing Configuration */}
        <div className="lg:col-span-2 space-y-4">
          {/* Fee Presets Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              网络实时推荐费率梯度 (Mempool Fee Tiers)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEFAULT_FEE_PRESETS.map((preset) => {
                const isSelected = satPerVbyte === preset.satPerVbyte;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSatPerVbyte(preset.satPerVbyte)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold font-sans text-white">{preset.label}</span>
                      <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                    <div className="font-mono text-base font-bold tabular-nums">
                      {preset.satPerVbyte} <span className="text-[11px] font-sans font-normal text-slate-500">sat/vB</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{preset.estMinutes}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Slider */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>微调自定义费率</span>
                <span className="font-mono text-amber-400 font-bold">{satPerVbyte} sat/vB</span>
              </div>
              <input
                type="range"
                min="1"
                max="120"
                value={satPerVbyte}
                onChange={(e) => setSatPerVbyte(parseInt(e.target.value) || 1)}
                className="w-full accent-amber-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>1 sat/vB (最低)</span>
                <span>30 sat/vB</span>
                <span>60 sat/vB</span>
                <span>120 sat/vB (极高)</span>
              </div>
            </div>
          </div>

          {/* Transaction Parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              交易体量与输入输出构造
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">输入脚本类型 (Input Type)</label>
                <select
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value as InputScriptType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="p2sh-p2wpkh">★ BIP49 P2SH-P2WPKH (3开头 ~91 vB)</option>
                  <option value="p2wpkh">BIP84 Native SegWit (bc1q ~68 vB)</option>
                  <option value="p2pkh">BIP44 Legacy (1开头 ~148 vB)</option>
                  <option value="multisig_2_3">2-of-3 多重签名 P2SH (3开头 ~297 vB)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">输入数量 (UTXO Inputs)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={inputCount}
                    onChange={(e) => setInputCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                  <span className="text-xs text-slate-500 shrink-0">笔 UTXO</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">输出脚本类型 (Output Type)</label>
                <select
                  value={outputType}
                  onChange={(e) => setOutputType(e.target.value as OutputScriptType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="p2sh">P2SH 兼容 (3开头 ~32 vB)</option>
                  <option value="p2wpkh">Native SegWit (bc1q ~31 vB)</option>
                  <option value="p2pkh">Legacy (1开头 ~34 vB)</option>
                  <option value="p2tr">Taproot (bc1p ~43 vB)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">输出总数 (Outputs: 收款人+找零)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={outputCount}
                    onChange={(e) => setOutputCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                  <span className="text-xs text-slate-500 shrink-0">个输出</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">参考拟转账金额 (BTC - 计算手续费占比)</label>
              <input
                type="text"
                value={transferAmountBtc}
                onChange={(e) => setTransferAmountBtc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Fee Calculation Result Card */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block pb-2 border-b border-slate-800">
              精确费率核算结果
            </span>

            {/* Total Satoshis & BTC */}
            <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4">
              <span className="text-xs text-slate-400 block mb-1">预估所需矿工费</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tabular-nums">
                  {calculation.feeSat.toLocaleString()}
                </span>
                <span className="text-xs text-amber-300/80 font-mono font-medium">satoshis</span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                ≈ {calculation.feeBtc} BTC
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>交易虚拟体积 (vSize):</span>
                <span className="font-mono text-white font-bold">{calculation.vSize} vBytes</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>总权重单位 (Weight):</span>
                <span className="font-mono text-slate-300">{calculation.weight} WU</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>费率单价:</span>
                <span className="font-mono text-amber-400">{calculation.satPerVbyte} sat/vB</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>转账金额占比:</span>
                <span className="font-mono text-slate-300">{feePercentOfTx}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>预估确认时间:</span>
                </span>
                <span className="font-medium text-emerald-400">{calculation.estConfirmation}</span>
              </div>
            </div>

            {/* SegWit Savings Box */}
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <TrendingDown className="w-4 h-4" />
                <span>3 开头隔离见证地址省费幅度</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                若使用传统 1 开头地址需消耗 <span className="font-mono text-slate-400">{calculation.legacyEquivalentFeeSat} sat</span>。
                当前 3 开头地址为您节省了 <span className="font-mono font-bold text-emerald-300">{calculation.savingsSat} sat</span>（降低约 <span className="font-bold text-emerald-300">{calculation.savingsPercent}%</span> 手续费）！
              </p>
            </div>
          </div>

          {/* RBF / Fee Optimization Tips */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>费率管理技巧与 RBF 原则：</span>
            </div>
            <p className="leading-relaxed">
              · AegisCold 离线签名时已默认开启 BIP125 RBF (可替代费率)。若交易因网络拥堵停滞，可使用更高费率重新签名并覆盖。
            </p>
            <p className="leading-relaxed">
              · 尽量在周末或北京时间深夜闲时广播交易，可低至 3-5 sat/vB 顺利入块。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
