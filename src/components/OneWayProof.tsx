import React, { useState } from 'react';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { ArrowDown, Lock, CheckCircle2, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import { base58CheckEncode } from '../crypto/bitcoin.ts';

export const OneWayProof: React.FC = () => {
  const [testInputHex, setTestInputHex] = useState(
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
  );

  let shaResult = '';
  let ripemdResult = '';
  let p2shAddress = '';
  let error = '';

  try {
    const clean = testInputHex.trim().replace(/^0x/, '');
    if (clean.length % 2 === 0 && clean.length > 0) {
      const b = hexToBytes(clean);
      const s = sha256(b);
      shaResult = bytesToHex(s);
      const r = ripemd160(s);
      ripemdResult = bytesToHex(r);

      // P2SH redeem script for 3... address
      const redeemScript = new Uint8Array(22);
      redeemScript[0] = 0x00;
      redeemScript[1] = 0x14;
      redeemScript.set(r, 2);

      const scriptHash = ripemd160(sha256(redeemScript));
      const payload = new Uint8Array(21);
      payload[0] = 0x05;
      payload.set(scriptHash, 1);
      p2shAddress = base58CheckEncode(payload);
    }
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>密码学证明：为什么任何地址都推导不出公钥？</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          单向陷门函数 · RIPEMD-160 有损压缩 · 量子计算抵御机制与数学原像抗性解析
        </p>
      </div>

      {/* Top 3 Core Mathematical Axioms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Lock className="w-4 h-4" />
            <h3 className="text-sm font-semibold">1. 原像抗性 (Pre-image Resistance)</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            SHA-256 与 RIPEMD-160 是密码学安全的强单向哈希函数。若要由 20 字节哈希值逆推公钥，平均需要计算 <span className="font-mono text-amber-300">2^160</span> 次哈希（约 1.46 × 10^48 次运算），即便耗尽全宇宙能量亦不可行。
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Cpu className="w-4 h-4" />
            <h3 className="text-sm font-semibold">2. 信息有损压缩 (Information Loss)</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            33 字节压缩公钥 (264 位) 经过双重哈希被压缩为 20 字节 (160 位)。数学上存在约 <span className="font-mono text-emerald-300">2^104</span> 个不同的输入能映射到同一个地址。因此即便具备无限算力，也无法确定原始公钥是哪一个。
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <ShieldAlert className="w-4 h-4" />
            <h3 className="text-sm font-semibold">3. 未花费地址具备天然抗量子性</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            量子计算机 Shor 算法只能攻击公开的椭圆曲线公钥点。而在比特币冷存储中，只要 3 开头或 1 开头的地址从未发起过转账花费，其真实公钥就从未在区块链广播，公钥受到哈希层绝对护盾保护。
          </p>
        </div>
      </div>

      {/* Step-by-Step Derivation & Trapdoor Pipeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-white">单向推导演示与实时算力陷门沙盒</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">从公钥到 3 开头地址的不可逆过程</span>
        </div>

        {/* Input box */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">
            输入 33 字节压缩公钥 (66位十六进制) 或任意哈希测试向量：
          </label>
          <input
            type="text"
            value={testInputHex}
            onChange={(e) => setTestInputHex(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
          />
          {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        </div>

        {/* Vertical Pipeline Visualization */}
        <div className="space-y-3 font-mono text-xs">
          {/* Step 1 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-sans font-semibold text-white">步骤 1：原始公钥 P (Secp256k1 椭圆曲线点)</span>
              <span>264 位 (33 字节)</span>
            </div>
            <p className="text-slate-300 break-all select-all">{testInputHex}</p>
          </div>

          <div className="flex justify-center text-slate-600">
            <ArrowDown className="w-5 h-5 text-amber-400/80 animate-pulse" />
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-sans font-semibold text-white">步骤 2：第一重哈希 SHA-256(P)</span>
              <span>256 位 (32 字节) · 雪崩效应</span>
            </div>
            <p className="text-amber-300/90 break-all select-all">{shaResult || '等待有效十六进制输入...'}</p>
          </div>

          <div className="flex justify-center text-slate-600">
            <ArrowDown className="w-5 h-5 text-amber-400/80 animate-pulse" />
          </div>

          {/* Step 3 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-sans font-semibold text-white">步骤 3：第二重哈希 RIPEMD-160(SHA-256(P))</span>
              <span className="text-rose-400 font-sans font-medium">★ 关键单向压缩：信息丢失 96 位</span>
            </div>
            <p className="text-emerald-300 break-all select-all font-semibold">
              {ripemdResult || '等待有效十六进制输入...'}
            </p>
          </div>

          <div className="flex justify-center text-slate-600">
            <ArrowDown className="w-5 h-5 text-amber-400/80 animate-pulse" />
          </div>

          {/* Step 4 */}
          <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 bg-amber-500/5">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-sans font-semibold text-amber-400">步骤 4：生成 3 开头的 P2SH-P2WPKH 地址</span>
              <span>Base58Check(0x05 + Hash160(RedeemScript))</span>
            </div>
            <p className="text-base text-amber-300 font-bold break-all select-all font-mono">
              {p2shAddress || '等待有效十六进制输入...'}
            </p>
          </div>
        </div>

        {/* Mathematical summary */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-1.5 text-white font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>不可逆审计结论：</span>
          </div>
          <p className="leading-relaxed">
            任何人在区块链上看到以 <span className="font-mono text-amber-400">3...</span> 开头的比特币冷钱包地址，面对的只是经过两次哈希处理的 20 字节数字指纹。
            在持币人发起签名交易、在输入脚本（witness / scriptSig）中主动提供公钥和有效数字签名之前，公钥在密码学上对外部世界是绝对隐匿的。
          </p>
        </div>
      </div>
    </div>
  );
};
