import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  Shield,
  KeyRound,
  AlertTriangle,
  QrCode,
  Download,
  ChevronDown,
  CheckCircle2,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DerivedAddress } from '../crypto/bitcoin.ts';
import { GeneratedAddressRecord } from '../types/addressRecord.ts';
import { QrModal } from './QrModal.tsx';

interface KeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  mnemonic: string;
  derivedAddress: DerivedAddress | null;
  addressRecords?: GeneratedAddressRecord[];
  onSelectActiveAddress?: (record: GeneratedAddressRecord) => void;
  shannonScore: number;
  currentPath: string;
  onPathChange: (path: string) => void;
  onRegenerate: () => void;
}

export const KeyManagementModal: React.FC<KeyManagementModalProps> = ({
  isOpen,
  onClose,
  mnemonic,
  derivedAddress,
  addressRecords = [],
  onSelectActiveAddress,
  shannonScore,
  currentPath,
  onPathChange,
  onRegenerate,
}) => {
  // Tabs: 'addresses' (select & export generated address private keys) vs 'root' (BIP39 mnemonic & HD path)
  const [modalTab, setModalTab] = useState<'addresses' | 'root'>('addresses');

  // Currently selected record for key inspection & export
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<'bip49' | 'bip84' | 'bip44'>('bip49');
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // QR Code Export Modal state
  const [qrExportData, setQrExportData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    data: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    data: '',
  });

  // Keep selected record synced with addressRecords or currentAddress
  useEffect(() => {
    if (addressRecords.length > 0) {
      // Find matching current address or default to first
      const matched = addressRecords.find((r) => r.addressP2SH === derivedAddress?.addressP2SH);
      setSelectedRecordId(matched ? matched.id : addressRecords[0].id);
    }
  }, [isOpen, addressRecords, derivedAddress]);

  if (!isOpen) return null;

  // Selected address record
  const currentRecord: GeneratedAddressRecord | null =
    addressRecords.find((r) => r.id === selectedRecordId) ||
    (derivedAddress
      ? {
          id: 'curr-active',
          index: derivedAddress.index,
          addressP2SH: derivedAddress.addressP2SH,
          addressBech32: derivedAddress.addressBech32,
          addressLegacy: derivedAddress.addressLegacy,
          path: derivedAddress.path,
          privKeyHex: derivedAddress.privKeyHex,
          wif: derivedAddress.wif,
          createdAt: Date.now(),
        }
      : null);

  const isSelectedActive = currentRecord && derivedAddress?.addressP2SH === currentRecord.addressP2SH;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Download offline keycard file (.txt)
  const handleDownloadKeyFile = () => {
    if (!currentRecord) return;
    const content = `=====================================================
AegisCold 比特币离线私钥导出备份单 (KeyCard)
=====================================================
导出时间: ${new Date().toLocaleString()}
地址序号: #${currentRecord.index}
HD 派生路径: ${currentRecord.path}

【收款地址 (P2SH 3开头)】
${currentRecord.addressP2SH}

【原生隔离见证 (Native SegWit)】
${currentRecord.addressBech32}

【私钥 WIF 格式 (Base58Check - 支持主流钱包扫码导入)】
${currentRecord.wif}

【私钥 HEX 格式 (256-bit 原始十六进制)】
${currentRecord.privKeyHex}

-----------------------------------------------------
安全警告:
1. 请勿将私钥保存在联网设备、邮件或云盘中。
2. 任何拥有上述私钥的人都可以完全控制该地址中的比特币资产。
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `btc-key-#${currentRecord.index}-${currentRecord.addressP2SH.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">私钥管理与导出中心</h3>
              <p className="text-[11px] text-slate-400">选择已生成地址 · 导出 WIF / Hex / 二维码</p>
            </div>
          </div>

          {/* Segmented Controller: [ 已生成地址私钥导出 ] vs [ BIP39 助记词与 HD 根 ] */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800/80 rounded-2xl gap-1 mb-4">
            <button
              type="button"
              onClick={() => setModalTab('addresses')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalTab === 'addresses'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>单地址私钥导出</span>
              {addressRecords.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    modalTab === 'addresses' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {addressRecords.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setModalTab('root')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalTab === 'root'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>助记词与 HD 路径</span>
            </button>
          </div>

          {/* TAB 1: Single Address Private Key Selection & Export Operations */}
          {modalTab === 'addresses' && (
            <div className="space-y-4">
              {/* Address Selection Dropdown / Selector */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>选择要导出私钥的地址:</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    已生成记录 ({addressRecords.length || 1} 个)
                  </span>
                </div>

                {addressRecords.length > 1 ? (
                  <div className="relative">
                    <select
                      value={selectedRecordId}
                      onChange={(e) => setSelectedRecordId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 appearance-none pr-8 cursor-pointer"
                    >
                      {addressRecords.map((rec) => {
                        const isMain = derivedAddress?.addressP2SH === rec.addressP2SH;
                        return (
                          <option key={rec.id} value={rec.id} className="bg-slate-900 text-slate-200">
                            #{rec.index} {isMain ? '(主收款) ' : ''}- {rec.addressP2SH}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-amber-300 truncate">
                    #{currentRecord?.index ?? 0} (当前主收款) - {currentRecord?.addressP2SH}
                  </div>
                )}

                {/* Quick horizontal chips to switch between recent addresses */}
                {addressRecords.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pt-1 pb-0.5">
                    {addressRecords.slice(0, 6).map((rec) => {
                      const isSel = rec.id === selectedRecordId;
                      return (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() => setSelectedRecordId(rec.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0 transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          #{rec.index} ({rec.addressP2SH.slice(0, 4)}...{rec.addressP2SH.slice(-4)})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Address Details Card */}
              {currentRecord && (
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-xs">
                        地址 #{currentRecord.index}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {currentRecord.path}
                      </span>
                    </div>

                    {isSelectedActive ? (
                      <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>当前主收款地址</span>
                      </span>
                    ) : (
                      onSelectActiveAddress && (
                        <button
                          type="button"
                          onClick={() => onSelectActiveAddress(currentRecord)}
                          className="text-amber-400 hover:text-amber-300 text-[11px] font-medium transition-colors cursor-pointer underline flex items-center gap-0.5"
                        >
                          <span>设为主收款</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>

                  {/* Address Type Selector for the selected record (Matching screenshot) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">切换展示地址类型:</span>
                      <span className="text-amber-400 font-mono text-[10px]">
                        {selectedFormat === 'bip49' && '3 开头推荐 BIP49'}
                        {selectedFormat === 'bip84' && '最低转账费率 (bc1q)'}
                        {selectedFormat === 'bip44' && '最高旧钱包兼容 (1...)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFormat('bip49')}
                        className={`py-1.5 px-1 rounded-xl text-xs font-mono transition-all text-center cursor-pointer ${
                          selectedFormat === 'bip49'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/70 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <div className="font-bold">BIP49</div>
                        <div className="text-[10px] text-amber-300/80">(3...)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFormat('bip84')}
                        className={`py-1.5 px-1 rounded-xl text-xs font-mono transition-all text-center cursor-pointer ${
                          selectedFormat === 'bip84'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/70 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <div className="font-bold">BIP84</div>
                        <div className="text-[10px] text-amber-300/80">(bc1q)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedFormat('bip44')}
                        className={`py-1.5 px-1 rounded-xl text-xs font-mono transition-all text-center cursor-pointer ${
                          selectedFormat === 'bip44'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/70 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <div className="font-bold">BIP44</div>
                        <div className="text-[10px] text-amber-300/80">(1...)</div>
                      </button>
                    </div>
                  </div>

                  {/* Public Address Display */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>
                        {selectedFormat === 'bip49' && '对应 3 开头公账地址 (BIP49 P2SH):'}
                        {selectedFormat === 'bip84' && '对应原生隔离见证地址 (BIP84 bc1q):'}
                        {selectedFormat === 'bip44' && '对应传统公账地址 (BIP44 1开头):'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const target =
                            selectedFormat === 'bip84'
                              ? currentRecord.addressBech32
                              : selectedFormat === 'bip44'
                              ? currentRecord.addressLegacy
                              : currentRecord.addressP2SH;
                          handleCopy(target, 'addr');
                        }}
                        className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'addr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'addr' ? '已复制' : '复制地址'}</span>
                      </button>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-xs text-amber-300 break-all select-all font-semibold border border-slate-800">
                      {selectedFormat === 'bip84'
                        ? currentRecord.addressBech32
                        : selectedFormat === 'bip44'
                        ? currentRecord.addressLegacy
                        : currentRecord.addressP2SH}
                    </div>
                  </div>

                  {/* Private Key WIF & Hex Display with Safety Mask */}
                  <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-400 font-semibold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>该地址私钥明文 (WIF 与 Hex)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPrivKey(!showPrivKey)}
                        className="text-slate-400 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {showPrivKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPrivKey ? '隐藏私钥' : '查看私钥'}</span>
                      </button>
                    </div>

                    {showPrivKey ? (
                      <div className="space-y-2 pt-1 font-mono text-xs">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>WIF 私钥 (通用导入格式):</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(currentRecord.wif, 'wif')}
                              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === 'wif' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === 'wif' ? '已复制' : '复制 WIF'}</span>
                            </button>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded-xl text-rose-300 break-all select-all font-semibold border border-rose-950">
                            {currentRecord.wif}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>256-bit Hex 原始私钥:</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(currentRecord.privKeyHex, 'hex')}
                              className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === 'hex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedKey === 'hex' ? '已复制' : '复制 Hex'}</span>
                            </button>
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl text-[11px] text-slate-400 break-all select-all">
                            {currentRecord.privKeyHex}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950 p-3 rounded-xl text-slate-600 font-mono text-center text-xs">
                        •••••••••••••••••••••••••••••••••••••••••••• (点击右上角查看私钥)
                      </div>
                    )}
                  </div>

                  {/* Dedicated Export Action Buttons Grid */}
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                      对应操作导出 (Export Actions):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Export Action 1: QR Code */}
                      <button
                        type="button"
                        onClick={() =>
                          setQrExportData({
                            isOpen: true,
                            title: `私钥二维码 (地址 #${currentRecord.index})`,
                            subtitle: '标准 WIF 格式私钥，可供离线设备或热端相机扫描导入',
                            data: currentRecord.wif,
                          })
                        }
                        className="py-2.5 px-3 rounded-xl bg-[#121826] hover:bg-[#1a2336] border border-slate-800 text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>导出二维码</span>
                      </button>

                      {/* Export Action 2: Download Keycard text file */}
                      <button
                        type="button"
                        onClick={handleDownloadKeyFile}
                        className="py-2.5 px-3 rounded-xl bg-[#121826] hover:bg-[#1a2336] border border-slate-800 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>导出备份卡 (.txt)</span>
                      </button>

                      {/* Export Action 3: Copy WIF directly */}
                      <button
                        type="button"
                        onClick={() => handleCopy(currentRecord.wif, 'wif-btn')}
                        className="py-2.5 px-3 rounded-xl bg-[#121826] hover:bg-[#1a2336] border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'wif-btn' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-rose-400" />
                        )}
                        <span>{copiedKey === 'wif-btn' ? '已复制 WIF' : '复制 WIF 私钥'}</span>
                      </button>

                      {/* Export Action 4: Copy HEX directly */}
                      <button
                        type="button"
                        onClick={() => handleCopy(currentRecord.privKeyHex, 'hex-btn')}
                        className="py-2.5 px-3 rounded-xl bg-[#121826] hover:bg-[#1a2336] border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedKey === 'hex-btn' ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <FileText className="w-4 h-4 text-cyan-400" />
                        )}
                        <span>{copiedKey === 'hex-btn' ? '已复制 Hex' : '复制 Hex 散列'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Root Mnemonic & HD Derivation Path Settings */}
          {modalTab === 'root' && (
            <div className="space-y-4">
              {/* Entropy Diagnostic */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">密码学 CSPRNG 随机度:</span>
                  <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{shannonScore.toFixed(3)} / 8.000 bits</span>
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: `${(shannonScore / 8) * 100}%` }}
                  />
                </div>
              </div>

              {/* Derivation Path setting */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>HD 钱包派生路径</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-400">3 开头推荐 BIP49</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bip49', label: 'BIP49 (3...)', path: "m/49'/0'/0'/0" },
                    { id: 'bip84', label: 'BIP84 (bc1q)', path: "m/84'/0'/0'/0" },
                    { id: 'bip44', label: 'BIP44 (1...)', path: "m/44'/0'/0'/0" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onPathChange(p.path)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono transition-colors text-center cursor-pointer ${
                        currentPath === p.path
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">自定义路径字串:</label>
                  <input
                    type="text"
                    value={currentPath}
                    onChange={(e) => onPathChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Mnemonic Phrase */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-white font-semibold">BIP39 助记词词表</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {showMnemonic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showMnemonic ? '隐藏' : '显示'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(mnemonic, 'mnem')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'mnem' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'mnem' ? '已复制' : '复制'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {mnemonic.split(' ').map((word, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex justify-between items-center text-xs"
                    >
                      <span className="text-[10px] text-slate-600 font-mono">{i + 1}</span>
                      <span className="font-mono text-slate-200 font-semibold">{showMnemonic ? word : '••••'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regenerate Button */}
              <button
                type="button"
                onClick={() => {
                  onRegenerate();
                }}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>全新生成随机助记词与金库</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Export Modal for Private Key */}
      <QrModal
        isOpen={qrExportData.isOpen}
        onClose={() => setQrExportData((prev) => ({ ...prev, isOpen: false }))}
        title={qrExportData.title}
        subtitle={qrExportData.subtitle}
        data={qrExportData.data}
      />
    </>
  );
};
