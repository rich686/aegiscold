import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  parsePrivateKeyOrMnemonic,
  ParsedKeyImport,
  ImportKeyType
} from '../crypto/bitcoin.ts';

interface ImportKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (parsed: ParsedKeyImport) => void;
}

export const ImportKeyModal: React.FC<ImportKeyModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'mnemonic' | 'wif' | 'hex'>('auto');
  const [inputVal, setInputVal] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [derivationPath, setDerivationPath] = useState("m/49'/0'/0'/0");
  const [previewResult, setPreviewResult] = useState<ParsedKeyImport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    if (!inputVal.trim()) {
      setPreviewResult(null);
      return;
    }

    try {
      const res = parsePrivateKeyOrMnemonic(inputVal, passphrase, derivationPath);
      setPreviewResult(res);
      setErrorMsg(null);
    } catch (e: unknown) {
      setPreviewResult(null);
      // Only set error if length is substantial
      if (inputVal.trim().length > 10) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    }
  }, [inputVal, passphrase, derivationPath]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewResult) {
      try {
        const res = parsePrivateKeyOrMnemonic(inputVal, passphrase, derivationPath);
        onConfirmImport(res);
        onClose();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    onConfirmImport(previewResult);
    onClose();
  };

  const handlePresetFill = (sample: string) => {
    setInputVal(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">多格式私钥与助记词导入</h3>
            <p className="text-[11px] text-slate-400">支持 BIP39 助记词、WIF 密匙、Hex 原始私钥等多重标准</p>
          </div>
        </div>

        {/* Tab selection for clarity */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-2xl mb-4 border border-slate-800/80 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('auto')}
            className={`py-1.5 rounded-xl transition-colors cursor-pointer text-center ${
              activeTab === 'auto'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            智能识别
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mnemonic')}
            className={`py-1.5 rounded-xl transition-colors cursor-pointer text-center ${
              activeTab === 'mnemonic'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            助记词
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wif')}
            className={`py-1.5 rounded-xl transition-colors cursor-pointer text-center ${
              activeTab === 'wif'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            WIF 密匙
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hex')}
            className={`py-1.5 rounded-xl transition-colors cursor-pointer text-center ${
              activeTab === 'hex'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hex 十六进制
          </button>
        </div>

        {/* Quick Format Explanations / Presets */}
        <div className="bg-slate-950/80 border border-slate-800/70 rounded-2xl p-3 mb-4 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-300">支持的格式特征：</span>
            <span className="text-[10px] text-slate-500">点击填入格式模板测试</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handlePresetFill('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-left truncate border border-slate-800"
            >
              <span className="text-amber-400 block font-mono">12/24 助记词</span>
              <span className="text-[10px] text-slate-500">BIP39 规范单词</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetFill('KxZCJnZ5k95bM8zL7W3b4n7pB7x7d1m6s4A2d3F4g5H6j7K8L9M0')}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-left truncate border border-slate-800"
            >
              <span className="text-emerald-400 block font-mono">WIF 私钥 (K/L/5)</span>
              <span className="text-[10px] text-slate-500">Base58 51-52 字符</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetFill('e9873d79c6d87dc0fb6a5778633389f4453213303da61f20bd67fc233aa33262')}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-left truncate border border-slate-800"
            >
              <span className="text-indigo-400 block font-mono">Hex 原始私钥</span>
              <span className="text-[10px] text-slate-500">64 位十六进制码</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              {activeTab === 'mnemonic'
                ? '输入 12 或 24 个英文助记词 (空格分隔)'
                : activeTab === 'wif'
                ? '输入 WIF 格式私钥 (以 K、L 或 5 开头)'
                : activeTab === 'hex'
                ? '输入 64 位十六进制私钥'
                : '粘贴助记词、WIF 密匙或 64 位十六进制私钥（自动识别）'}
            </label>
            <textarea
              rows={3}
              required
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="在此粘贴助记词或私钥明文..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Optional Mnemonic Derivation Path Settings (Visible if mnemonic detected or selected) */}
          {(activeTab === 'mnemonic' || previewResult?.type === 'mnemonic') && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 animate-fade-in text-xs">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span>HD 派生路径设置</span>
                <span className="font-mono text-amber-400">生成 3 开头推荐 BIP49</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'BIP49 (3...)', path: "m/49'/0'/0'/0" },
                  { label: 'BIP84 (bc1q)', path: "m/84'/0'/0'/0" },
                  { label: 'BIP44 (1...)', path: "m/44'/0'/0'/0" },
                ].map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => setDerivationPath(p.path)}
                    className={`py-1 px-2 rounded-xl text-center font-mono text-[11px] border cursor-pointer ${
                      derivationPath === p.path
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">可选助记词密语盐 (Passphrase / 选填):</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="留空即为默认空密码"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Validation Feedback & Preview */}
          {previewResult && (
            <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-3.5 space-y-2 animate-fade-in text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>已识别格式: {previewResult.typeLabel}</span>
                </div>
                <span className="text-[10px] bg-emerald-900/40 text-emerald-300 px-2 py-0.5 rounded font-mono">
                  验证通过
                </span>
              </div>

              <div className="pt-1.5 border-t border-emerald-900/40 space-y-1 font-mono text-[11px]">
                <div className="text-slate-400">
                  <span className="text-slate-500">派生的 3 开头地址: </span>
                  <span className="text-amber-300 font-semibold break-all">{previewResult.addressP2SH}</span>
                </div>
                <div className="text-slate-400 truncate">
                  <span className="text-slate-500">压缩公钥: </span>
                  <span className="text-slate-300">{previewResult.pubKeyHex.slice(0, 16)}...{previewResult.pubKeyHex.slice(-8)}</span>
                </div>
              </div>
            </div>
          )}

          {errorMsg && !previewResult && (
            <div className="bg-rose-950/40 border border-rose-900/60 rounded-2xl p-3 text-xs text-rose-300 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!previewResult}
              className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <span>立即载入冷端并切换为主钱包</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-4 rounded-2xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>私钥全程驻留易失内存，关机或刷新即刻物理销毁</span>
        </div>
      </div>
    </div>
  );
};
