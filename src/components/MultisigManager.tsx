import React, { useState } from 'react';
import {
  createMultisigP2SH,
  verifyMultisigSignatures,
  MultisigResult,
  SignatureVerificationResult
} from '../crypto/multisig.ts';
import {
  Users,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  QrCode
} from 'lucide-react';
import * as secp from '@noble/secp256k1';
import { bytesToHex } from '@noble/hashes/utils.js';
import { QrModal } from './QrModal.tsx';
import { WatchOnlyWalletItem } from '../types/watchWallet.ts';

interface MultisigManagerProps {
  onAddToWatch: (item: Omit<WatchOnlyWalletItem, 'id' | 'createdAt'>) => void;
}

export const MultisigManager: React.FC<MultisigManagerProps> = ({ onAddToWatch }) => {
  // Multisig Builder State
  const [mThreshold, setMThreshold] = useState(2);
  const [cosignerKeys, setCosignerKeys] = useState<string[]>([
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
    '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
  ]);

  const [multisigResult, setMultisigResult] = useState<MultisigResult | null>(() => {
    try {
      return createMultisigP2SH(2, [
        '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
        '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
      ]);
    } catch {
      return null;
    }
  });

  const [builderError, setBuilderError] = useState<string | null>(null);

  // Verification Sandbox State
  const [verifyDigestHex, setVerifyDigestHex] = useState(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  );
  const [signatureInputs, setSignatureInputs] = useState<string[]>([
    '',
    '',
  ]);
  const [verificationOutput, setVerificationOutput] = useState<SignatureVerificationResult | null>(null);

  // UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{ title: string; data: string; subtitle?: string } | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Re-generate multisig address
  const handleRecalculateMultisig = () => {
    setBuilderError(null);
    try {
      const res = createMultisigP2SH(mThreshold, cosignerKeys);
      setMultisigResult(res);
    } catch (err: unknown) {
      setBuilderError(err instanceof Error ? err.message : String(err));
      setMultisigResult(null);
    }
  };

  const handleKeyChange = (index: number, val: string) => {
    const updated = [...cosignerKeys];
    updated[index] = val;
    setCosignerKeys(updated);
  };

  const handleAddCosigner = () => {
    if (cosignerKeys.length >= 7) return;
    // Generate random mock key
    const randPriv = new Uint8Array(32);
    crypto.getRandomValues(randPriv);
    const pub = secp.getPublicKey(randPriv, true);
    setCosignerKeys([...cosignerKeys, bytesToHex(pub)]);
  };

  const handleRemoveCosigner = (index: number) => {
    if (cosignerKeys.length <= 2) return;
    const updated = cosignerKeys.filter((_, i) => i !== index);
    setCosignerKeys(updated);
    if (mThreshold > updated.length) {
      setMThreshold(updated.length);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Run multi-sig signature verification
  const handleRunVerify = () => {
    if (!multisigResult) return;
    const cleanSigs = signatureInputs.filter((s) => s.trim().length > 0);
    const result = verifyMultisigSignatures(
      verifyDigestHex,
      multisigResult.sortedPublicKeys,
      cleanSigs,
      mThreshold
    );
    setVerificationOutput(result);
  };

  // Helper to generate a live mock signature for testing the validator
  const handleGenerateSampleSignature = (keyIndex: number) => {
    try {
      // In a real flow, the cosigner signs on their own offline phone
      // Here we simulate cosigner signature generation
      const randPriv = new Uint8Array(32);
      crypto.getRandomValues(randPriv);
      const testDigest = new Uint8Array(32);
      crypto.getRandomValues(testDigest);
      const digestHex = bytesToHex(testDigest);
      setVerifyDigestHex(digestHex);

      const pubKey = secp.getPublicKey(randPriv, true);
      const updatedKeys = [...cosignerKeys];
      updatedKeys[keyIndex] = bytesToHex(pubKey);
      setCosignerKeys(updatedKeys);

      const res = createMultisigP2SH(mThreshold, updatedKeys);
      setMultisigResult(res);

      const sig = secp.sign(testDigest, randPriv, { prehash: false });
      const sigHex = bytesToHex(sig);

      const updatedSigs = [...signatureInputs];
      updatedSigs[keyIndex] = sigHex;
      setSignatureInputs(updatedSigs);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>多重签名脚本与验证中心 (Multisig P2SH)</span>
            <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              BIP16 / BIP67
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            生成 3 开头的多签托管地址 · 脚本反汇编与 BIP67 字典序排序 · 离线联合签名数学门限验证
          </p>
        </div>

        <button
          onClick={handleRecalculateMultisig}
          className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>重新构建多签脚本</span>
        </button>
      </div>

      {builderError && (
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-xs text-rose-300">
          {builderError}
        </div>
      )}

      {/* Part 1: Multisig Address Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">联合签名者 (Cosigners) 配置</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {mThreshold}-of-{cosignerKeys.length} 门限
            </span>
          </div>

          {/* Threshold Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">必须满足签名数 (M)</label>
              <select
                value={mThreshold}
                onChange={(e) => setMThreshold(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                {Array.from({ length: cosignerKeys.length }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    至少 {num} 个签名有效
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">联合参与方总数 (N)</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300">
                {cosignerKeys.length} 位协作者
              </div>
            </div>
          </div>

          {/* Cosigners Public Key Inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>压缩公钥列表 (33 字节 / 66 位十六进制):</span>
              <button
                onClick={handleAddCosigner}
                disabled={cosignerKeys.length >= 7}
                className="text-amber-400 hover:underline flex items-center gap-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加协作者</span>
              </button>
            </div>

            {cosignerKeys.map((key, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>参与方 #{i + 1}</span>
                  {cosignerKeys.length > 2 && (
                    <button
                      onClick={() => handleRemoveCosigner(i)}
                      className="text-rose-400 hover:underline flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>移除</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => handleKeyChange(i, e.target.value)}
                  placeholder="02... 或 03... (66位十六进制)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Derived 3... Multisig Address & Script */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-sm font-semibold text-white">生成的多签 P2SH 地址与赎回脚本</span>
            <span className="text-xs font-mono text-amber-400">标准 3 开头</span>
          </div>

          {multisigResult ? (
            <div className="space-y-3 text-xs">
              {/* The Address starting with 3 */}
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-amber-400">
                    ★ P2SH 多重签名主地址 (3...)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(multisigResult.p2shAddress, 'ms-addr')}
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === 'ms-addr' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'ms-addr' ? '已复制' : '复制'}</span>
                    </button>
                    <button
                      onClick={() =>
                        setQrModalData({
                          title: '多签收款地址 (3开头)',
                          data: multisigResult.p2shAddress,
                          subtitle: `${mThreshold}-of-${cosignerKeys.length} P2SH Multisig`,
                        })
                      }
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>二维码</span>
                    </button>
                  </div>
                </div>
                <p className="font-mono text-sm sm:text-base text-amber-300 font-bold break-all select-all">
                  {multisigResult.p2shAddress}
                </p>
              </div>

              {/* Action: Add to Watch Wallets */}
              <button
                onClick={() => {
                  onAddToWatch({
                    label: `${mThreshold}-of-${cosignerKeys.length} 联合冷金库`,
                    addressOrXpub: multisigResult.p2shAddress,
                    type: 'multisig',
                    derivationPath: '多签托管',
                    balanceSat: 0,
                    utxos: [],
                    notes: `BIP16 P2SH, 赎回脚本: ${multisigResult.redeemScriptHex.slice(0, 16)}...`,
                  });
                  setAddedSuccess(true);
                  setTimeout(() => setAddedSuccess(false), 2000);
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>{addedSuccess ? '已成功存入观察钱包' : '一键将多签地址存入观察钱包'}</span>
              </button>

              {/* Script ASM */}
              <div>
                <span className="text-slate-400 block mb-1">赎回脚本汇编指令 (RedeemScript ASM):</span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-slate-300 break-all select-all">
                  {multisigResult.redeemScriptAsm}
                </div>
              </div>

              {/* Redeem Script Hex */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>赎回脚本十六进制 (RedeemScript HEX):</span>
                  <button
                    onClick={() => handleCopy(multisigResult.redeemScriptHex, 'rs-hex')}
                    className="text-amber-400 hover:underline"
                  >
                    {copiedKey === 'rs-hex' ? '已复制' : '复制 HEX'}
                  </button>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-slate-400 break-all select-all max-h-24 overflow-y-auto custom-scrollbar">
                  {multisigResult.redeemScriptHex}
                </div>
              </div>

              {/* BIP67 Sorted Notice */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-slate-400 leading-relaxed">
                <span className="text-slate-200 font-semibold block mb-0.5">BIP67 规范校验：</span>
                所有公钥已依照 BIP67 字典序自动排序，确保不同冷钱包终端或 Electrum 导出的脚本哈希完全一致。
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-8">请完善左侧公钥以计算多签地址</p>
          )}
        </div>
      </div>

      {/* Part 2: Multisig Signature Verifier Engine */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">多签交易门限签名验证器 (Signature Verifier)</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            需满足至少 {mThreshold} 个不同协作者的有效 Secp256k1 数字签名
          </span>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">待核验的交易消息哈希 (32 字节 / 64位十六进制)</label>
          <input
            type="text"
            value={verifyDigestHex}
            onChange={(e) => setVerifyDigestHex(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Input Signatures */}
        <div className="space-y-3">
          <span className="text-xs text-slate-400 block">各参与方提供的离线签名 (DER 或 64位紧凑格式)：</span>
          {signatureInputs.map((sig, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={sig}
                onChange={(e) => {
                  const updated = [...signatureInputs];
                  updated[idx] = e.target.value;
                  setSignatureInputs(updated);
                }}
                placeholder={`参与方签名 #${idx + 1}`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => handleGenerateSampleSignature(idx % cosignerKeys.length)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors whitespace-nowrap"
              >
                模拟签名
              </button>
            </div>
          ))}

          {signatureInputs.length < cosignerKeys.length && (
            <button
              onClick={() => setSignatureInputs([...signatureInputs, ''])}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加更多签名栏</span>
            </button>
          )}
        </div>

        <button
          onClick={handleRunVerify}
          className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>执行多签密码学门限验证</span>
        </button>

        {/* Verification Result Inspection */}
        {verificationOutput && (
          <div
            className={`mt-4 p-4 rounded-xl border animate-fade-in text-xs ${
              verificationOutput.isValid
                ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
              {verificationOutput.isValid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>多重签名门限验证通过！(已获得 {verificationOutput.validCount} / {verificationOutput.thresholdRequired} 签名)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>验证失败：有效签名数不足 ({verificationOutput.validCount} / 必须需 {verificationOutput.thresholdRequired})</span>
                </>
              )}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
              {verificationOutput.signaturesChecked.map((chk, i) => (
                <div key={i} className="flex items-center justify-between text-slate-300">
                  <span className="truncate max-w-xs">
                    签名 #{i + 1}: {chk.signatureHex.slice(0, 16)}...
                  </span>
                  <span className={chk.isValid ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                    {chk.isValid ? `✓ 匹配协作者公钥 #${chk.keyIndex + 1}` : '✕ 无效或公钥未匹配'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
