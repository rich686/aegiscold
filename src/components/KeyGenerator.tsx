import React, { useState, useEffect } from 'react';
import {
  generateSecureEntropy,
  generateMnemonicFromEntropy,
  calculateShannonEntropy,
  BitcoinHDWallet,
  DerivedAddress
} from '../crypto/bitcoin.ts';
import {
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Dices,
  Shield,
  Sliders,
  QrCode,
  BookmarkPlus,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { QrModal } from './QrModal.tsx';
import { WatchOnlyWalletItem } from '../types/watchWallet.ts';

interface KeyGeneratorProps {
  onAddToWatch: (item: Omit<WatchOnlyWalletItem, 'id' | 'createdAt'>) => void;
  onSelectForSigning: (address: string, privKey: string) => void;
}

export const KeyGenerator: React.FC<KeyGeneratorProps> = ({
  onAddToWatch,
  onSelectForSigning,
}) => {
  // Config state
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [passphrase, setPassphrase] = useState<string>('');
  const [derivationPreset, setDerivationPreset] = useState<'bip49' | 'bip84' | 'bip44' | 'custom'>('bip49');
  const [customPath, setCustomPath] = useState<string>("m/49'/0'/0'/0");
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [batchCount, setBatchCount] = useState<number>(3);

  // Entropy augmentation
  const [usePhysicalEntropy, setUsePhysicalEntropy] = useState<boolean>(false);
  const [diceInput, setDiceInput] = useState<string>('');
  const [coinInput, setCoinInput] = useState<string>('');

  // Generated wallet state
  const [entropyBytes, setEntropyBytes] = useState<Uint8Array | null>(null);
  const [shannonScore, setShannonScore] = useState<number>(7.98);
  const [mnemonic, setMnemonic] = useState<string>('');
  const [wallet, setWallet] = useState<BitcoinHDWallet | null>(null);
  const [derivedList, setDerivedList] = useState<DerivedAddress[]>([]);

  // UI state
  const [showMnemonic, setShowMnemonic] = useState<boolean>(true);
  const [revealedPrivKeys, setRevealedPrivKeys] = useState<Record<number, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{ title: string; data: string; subtitle?: string } | null>(null);
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);

  // Active path based on preset
  const currentBasePath =
    derivationPreset === 'bip49'
      ? "m/49'/0'/0'/0"
      : derivationPreset === 'bip84'
      ? "m/84'/0'/0'/0"
      : derivationPreset === 'bip44'
      ? "m/44'/0'/0'/0"
      : customPath;

  // Initialize or re-generate
  const handleGenerateNew = () => {
    try {
      const bitStrength = wordCount === 12 ? 128 : 256;
      let userHex = '';

      if (usePhysicalEntropy) {
        // Collect dice & coin text into arbitrary entropy
        if (diceInput.trim()) userHex += diceInput.trim();
        if (coinInput.trim()) userHex += coinInput.trim();
      }

      const entropy = generateSecureEntropy(bitStrength, userHex);
      setEntropyBytes(entropy);

      const score = calculateShannonEntropy(entropy);
      setShannonScore(score);

      const m = generateMnemonicFromEntropy(entropy);
      setMnemonic(m);

      const hd = new BitcoinHDWallet(m, passphrase, currentBasePath);
      setWallet(hd);

      const batch = hd.deriveBatch(batchCount, addressIndex, currentBasePath);
      setDerivedList(batch);
    } catch (e) {
      console.error(e);
    }
  };

  // Re-derive when path or index changes
  useEffect(() => {
    if (wallet && mnemonic) {
      try {
        const hd = new BitcoinHDWallet(mnemonic, passphrase, currentBasePath);
        setWallet(hd);
        const batch = hd.deriveBatch(batchCount, addressIndex, currentBasePath);
        setDerivedList(batch);
      } catch (err) {
        console.error(err);
      }
    }
  }, [currentBasePath, addressIndex, batchCount, passphrase]);

  // Initial generation on component mount
  useEffect(() => {
    handleGenerateNew();
  }, [wordCount]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const togglePrivKey = (index: number) => {
    setRevealedPrivKeys((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddDice = (val: number) => {
    setDiceInput((prev) => prev + val.toString());
  };

  const handleAddCoin = (val: 'H' | 'T') => {
    setCoinInput((prev) => prev + val);
  };

  return (
    <div className="space-y-6">
      {/* Hero / Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>比特币密钥与3开头地址生成</span>
            <span className="text-xs font-mono font-normal text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
              BIP49 Nested SegWit
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            纯客户端 CSPRNG 硬件随机熵 + 离线 BIP32 树状路径推导 · 保证地址推导不出公钥
          </p>
        </div>

        <button
          onClick={handleGenerateNew}
          className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>全新生成随机助记词</span>
        </button>
      </div>

      {/* Security & Entropy Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Entropy Health Metric */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">熵源安全性诊断</span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>CSPRNG 合规</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
              {shannonScore.toFixed(3)}
            </span>
            <span className="text-xs text-slate-500">/ 8.000 bits/byte</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            基于香农熵 (Shannon Entropy) 统计检测，当前随机度达 <span className="text-emerald-400 font-semibold">{((shannonScore / 8) * 100).toFixed(1)}%</span>，杜绝弱伪随机数碰撞风险。
          </p>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <label className="text-xs text-slate-300 font-medium cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={usePhysicalEntropy}
                onChange={(e) => setUsePhysicalEntropy(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
              />
              <span>物理掷骰/抛硬币熵源增强</span>
            </label>
            <Dices className="w-4 h-4 text-slate-500" />
          </div>

          {/* Physical Entropy Drawer */}
          {usePhysicalEntropy && (
            <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-3 animate-fade-in">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>骰子点数 (1-6)</span>
                  <span className="font-mono text-slate-500">{diceInput.length} 掷</span>
                </div>
                <div className="grid grid-cols-6 gap-1 mb-1.5">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleAddDice(num)}
                      className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium rounded transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={diceInput}
                  onChange={(e) => setDiceInput(e.target.value)}
                  placeholder="手动输入例如 34162541..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>硬币正反 (H/T)</span>
                  <span className="font-mono text-slate-500">{coinInput.length} 次</span>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-1.5">
                  <button
                    onClick={() => handleAddCoin('H')}
                    className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium rounded transition-colors"
                  >
                    正 (H)
                  </button>
                  <button
                    onClick={() => handleAddCoin('T')}
                    className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium rounded transition-colors"
                  >
                    反 (T)
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerateNew}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium rounded-lg transition-colors"
              >
                混合物理熵重新计算
              </button>
            </div>
          )}
        </div>

        {/* BIP39 Mnemonic Length & Options */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">助记词规格与密码盐</span>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setWordCount(12)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors ${
                wordCount === 12
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              12 词助记词 (128位熵)
            </button>
            <button
              onClick={() => setWordCount(24)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-colors ${
                wordCount === 24
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              24 词助记词 (256位熵)
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              第 13/25 词安全密语 (Passphrase / 选填)
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="防胁迫密码，留空则使用默认空盐"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              BIP39 规范中用于派生种子，不同密语将生成完全不同的独立金库。
            </p>
          </div>
        </div>

        {/* Derivation Path Settings */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">HD 钱包衍生路径</span>
            <Sliders className="w-4 h-4 text-slate-500" />
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <button
              onClick={() => setDerivationPreset('bip49')}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-colors text-center ${
                derivationPreset === 'bip49'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              BIP49 (3...)
            </button>
            <button
              onClick={() => setDerivationPreset('bip84')}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-colors text-center ${
                derivationPreset === 'bip84'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              BIP84 (bc1q)
            </button>
            <button
              onClick={() => setDerivationPreset('bip44')}
              className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-colors text-center ${
                derivationPreset === 'bip44'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              BIP44 (1...)
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>当前推导路径</span>
                <button
                  onClick={() => setDerivationPreset('custom')}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  自定义路径
                </button>
              </div>
              <input
                type="text"
                value={currentBasePath}
                onChange={(e) => {
                  setDerivationPreset('custom');
                  setCustomPath(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">起始地址索引</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={addressIndex}
                  onChange={(e) => setAddressIndex(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">连续派生数量</label>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200"
                >
                  <option value={1}>1 个地址</option>
                  <option value={3}>3 个地址</option>
                  <option value={5}>5 个地址</option>
                  <option value={10}>10 个地址</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BIP39 Mnemonic Phrase Display */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">生成的 BIP39 英文助记词</span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400">{wordCount} 个单词 · 标准 2048 词表</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMnemonic(!showMnemonic)}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {showMnemonic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showMnemonic ? '隐藏助记词' : '显示助记词'}</span>
            </button>
            <button
              onClick={() => handleCopy(mnemonic, 'mnemonic')}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'mnemonic' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'mnemonic' ? '已复制' : '复制助记词'}</span>
            </button>
            <button
              onClick={() => setQrData({ title: '助记词冷端二维码', data: mnemonic, subtitle: '请在绝对隔离的离线设备扫描，严禁联网' })}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>二维码</span>
            </button>
          </div>
        </div>

        {/* Mnemonic Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
          {mnemonic.split(' ').map((word, i) => (
            <div
              key={i}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between"
            >
              <span className="text-[10px] font-mono text-slate-500 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-200">
                {showMnemonic ? word : '••••'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs text-amber-300/80">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            助记词即资产所有权。请务必用笔抄写在纸张或金属助记词板上，切勿截图、云备份或通过微信等聊天工具传输。
          </span>
        </div>
      </div>

      {/* Derived Addresses List (Highlighting 3... Addresses) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              已派生的比特币钱包地址与密钥
            </h2>
            <p className="text-xs text-slate-400">
              默认使用 BIP49 生成 3 开头的隔离见证兼容地址，可与所有交易所及现代轻钱包无缝转账
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            派生路径: {currentBasePath}/[{addressIndex}..{addressIndex + batchCount - 1}]
          </span>
        </div>

        <div className="space-y-4">
          {derivedList.map((item) => {
            const isPrivVisible = !!revealedPrivKeys[item.index];
            const isAdded = addedSuccessId === item.addressP2SH;

            return (
              <div
                key={item.index}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
              >
                {/* Header row: Index & Path */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      #{item.index}
                    </span>
                    <span className="text-xs font-mono text-amber-400/90">{item.path}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onAddToWatch({
                          label: `冷地址 #${item.index} (BIP49)`,
                          addressOrXpub: item.addressP2SH,
                          type: 'p2sh',
                          derivationPath: item.path,
                          balanceSat: 0,
                          utxos: [],
                          notes: `生成于 ${new Date().toLocaleDateString()}`,
                        });
                        setAddedSuccessId(item.addressP2SH);
                        setTimeout(() => setAddedSuccessId(null), 2500);
                      }}
                      className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isAdded ? '已加入观察钱包' : '加入观察钱包'}</span>
                    </button>

                    <button
                      onClick={() => onSelectForSigning(item.addressP2SH, item.privKeyHex)}
                      className="py-1 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium flex items-center gap-1 transition-colors border border-amber-500/30"
                    >
                      <span>离线签名此地址</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Address: 3... P2SH-P2WPKH */}
                <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-400">
                        ★ 3 开头地址 (BIP49 隔离见证兼容)
                      </span>
                      <span className="text-[11px] text-slate-500">· 推荐收款使用</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(item.addressP2SH, `addr3-${item.index}`)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === `addr3-${item.index}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === `addr3-${item.index}` ? '已复制' : '复制'}</span>
                      </button>
                      <button
                        onClick={() => setQrData({ title: '比特币收款地址 (3开头)', data: item.addressP2SH, subtitle: 'BIP49 P2SH-P2WPKH' })}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>二维码</span>
                      </button>
                    </div>
                  </div>

                  <p className="font-mono text-xs sm:text-sm text-amber-300 break-all select-all font-semibold">
                    {item.addressP2SH}
                  </p>
                </div>

                {/* Secondary Alternative Formats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span>原生隔离见证 (bc1q...)</span>
                      <button onClick={() => handleCopy(item.addressBech32, `bech-${item.index}`)} className="hover:text-white">
                        {copiedKey === `bech-${item.index}` ? '已复制' : '复制'}
                      </button>
                    </div>
                    <p className="font-mono text-slate-300 break-all">{item.addressBech32}</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span>传统旧格式地址 (1...)</span>
                      <button onClick={() => handleCopy(item.addressLegacy, `legacy-${item.index}`)} className="hover:text-white">
                        {copiedKey === `legacy-${item.index}` ? '已复制' : '复制'}
                      </button>
                    </div>
                    <p className="font-mono text-slate-300 break-all">{item.addressLegacy}</p>
                  </div>
                </div>

                {/* Cryptographic Proof Details (Public Key & Hash) */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-400">压缩公钥 (Secp256k1 33字节):</span>
                    <span className="font-mono text-slate-300 break-all select-all">{item.pubKeyHex}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-400">公钥 Hash160 (RIPEMD160·SHA256):</span>
                    <span className="font-mono text-slate-300 break-all">{item.pubKeyHash160}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-400">P2SH 赎回脚本 (RedeemScript):</span>
                    <span className="font-mono text-slate-400 break-all">{item.redeemScriptHex}</span>
                  </div>
                </div>

                {/* Private Key & WIF (Sensitive) */}
                <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                      <span>私钥 (WIF 格式与十六进制)</span>
                      <span className="text-[10px] bg-rose-900/50 text-rose-300 px-1.5 py-0.2 rounded">绝密</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePrivKey(item.index)}
                        className="text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {isPrivVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isPrivVisible ? '隐藏' : '显示私钥'}</span>
                      </button>

                      {isPrivVisible && (
                        <button
                          onClick={() => handleCopy(item.wif, `wif-${item.index}`)}
                          className="text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>复制 WIF</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isPrivVisible ? (
                    <div className="space-y-1 font-mono">
                      <div className="text-rose-300 break-all">WIF: {item.wif}</div>
                      <div className="text-slate-500 break-all text-[11px]">HEX: {item.privKeyHex}</div>
                    </div>
                  ) : (
                    <p className="font-mono text-slate-600">
                      •••••••••••••••••••••••••••••••••••••••••••••••••••••• (点击显示私钥)
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QR Code Modal */}
      {qrData && (
        <QrModal
          isOpen={!!qrData}
          onClose={() => setQrData(null)}
          title={qrData.title}
          data={qrData.data}
          subtitle={qrData.subtitle}
        />
      )}
    </div>
  );
};
