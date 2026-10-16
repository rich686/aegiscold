import React, { useState } from 'react';
import {
  signOfflineTransaction,
  signBitcoinMessage,
  RawTransactionPlan,
  SignedTxResult
} from '../crypto/signing.ts';
import {
  FileSignature,
  QrCode,
  Copy,
  Check,
  Send,
  AlertCircle,
  Download,
  KeyRound,
  FileText
} from 'lucide-react';
import { QrModal } from './QrModal.tsx';
import * as secp from '@noble/secp256k1';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils.js';
import { base58CheckDecode } from '../crypto/bitcoin.ts';

interface OfflineSignerProps {
  initialAddress?: string;
  initialPrivKeyHex?: string;
}

export const OfflineSigner: React.FC<OfflineSignerProps> = ({
  initialAddress = '',
  initialPrivKeyHex = '',
}) => {
  const [activeSignMode, setActiveSignMode] = useState<'tx' | 'message'>('tx');

  // Transaction signing fields
  const [txid, setTxid] = useState(
    '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b'
  );
  const [vout, setVout] = useState(0);
  const [inputAmountBtc, setInputAmountBtc] = useState('0.15000000');
  const [scriptType, setScriptType] = useState<'p2sh-p2wpkh' | 'p2pkh' | 'p2wpkh'>('p2sh-p2wpkh');

  const [toAddress, setToAddress] = useState('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy');
  const [sendAmountBtc, setSendAmountBtc] = useState('0.10000000');
  const [changeAddress, setChangeAddress] = useState(
    initialAddress || '347N1Thc213QqfYCz3PZafpausefqic3R5'
  );
  const [feeSat, setFeeSat] = useState(2500);

  // Private key
  const [privKeyInput, setPrivKeyInput] = useState(
    initialPrivKeyHex || 'e9873d79c6d87dc0fb6a5778633389f4453213303da61f20bd67fc233aa33262'
  );

  // Message signing
  const [messageText, setMessageText] = useState('AegisCold 离线冷端安全验证测试 - 2026');
  const [signedMsgResult, setSignedMsgResult] = useState<{
    signatureBase64: string;
    address: string;
    hashHex: string;
  } | null>(null);

  // Results & UI
  const [signedTxResult, setSignedTxResult] = useState<SignedTxResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{ title: string; data: string; subtitle?: string } | null>(null);

  // Helper to normalize private key from WIF or Hex
  const getNormalizedPrivKeyHex = (input: string): string => {
    const clean = input.trim();
    if (/^[0-9a-fA-F]{64}$/.test(clean)) {
      return clean.toLowerCase();
    }
    // Attempt WIF decode (starts with 5, K, L)
    try {
      const decoded = base58CheckDecode(clean);
      if (decoded.length === 33 && decoded[0] === 0x80) {
        // Uncompressed
        return bytesToHex(decoded.slice(1));
      } else if (decoded.length === 34 && decoded[0] === 0x80 && decoded[33] === 0x01) {
        // Compressed WIF
        return bytesToHex(decoded.slice(1, 33));
      }
    } catch {
      // ignore
    }
    return clean;
  };

  const handleSignTransaction = () => {
    setErrorMsg(null);
    try {
      const cleanPrivKey = getNormalizedPrivKeyHex(privKeyInput);
      if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivKey)) {
        throw new Error('无效的私钥格式：必须为 64 位十六进制或合法 WIF 密匙');
      }

      const privBytes = hexToBytes(cleanPrivKey);
      const pubKeyBytes = secp.getPublicKey(privBytes, true);
      const pubKeyHex = bytesToHex(pubKeyBytes);

      const inSat = Math.round(parseFloat(inputAmountBtc) * 100_000_000);
      const outSat = Math.round(parseFloat(sendAmountBtc) * 100_000_000);
      const changeSat = inSat - outSat - feeSat;

      if (inSat <= 0 || outSat <= 0) {
        throw new Error('金额必须大于 0');
      }
      if (changeSat < 0) {
        throw new Error(`输入金额不足：总输入 ${inSat} sat < 发送金额 (${outSat} sat) + 矿工费 (${feeSat} sat)`);
      }

      const outputs = [
        { address: toAddress.trim(), amountSat: outSat },
      ];

      // Add change output if change > dust limit (546 sat)
      if (changeSat >= 546 && changeAddress.trim()) {
        outputs.push({
          address: changeAddress.trim(),
          amountSat: changeSat,
        });
      }

      const plan: RawTransactionPlan = {
        inputs: [
          {
            txid: txid.trim(),
            vout: Number(vout),
            amountSat: inSat,
            scriptType,
            privateKeyHex: cleanPrivKey,
            publicKeyHex: pubKeyHex,
          },
        ],
        outputs,
        feeSat,
      };

      const signed = signOfflineTransaction(plan);
      setSignedTxResult(signed);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSignMessage = () => {
    setErrorMsg(null);
    try {
      const cleanPrivKey = getNormalizedPrivKeyHex(privKeyInput);
      if (!/^[0-9a-fA-F]{64}$/.test(cleanPrivKey)) {
        throw new Error('无效的私钥格式');
      }
      const res = signBitcoinMessage(messageText, cleanPrivKey);
      setSignedMsgResult(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadTxFile = () => {
    if (!signedTxResult) return;
    const blob = new Blob([signedTxResult.rawTxHex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tx-${signedTxResult.txid.slice(0, 8)}.hex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>离线签名中心 (Cold Signer)</span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              气隙隔离 (Air-Gap)
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            私钥永不触网 · 离线构造并签署隔离见证 P2SH 3... 地址交易 · 通过二维码或纯文本转交热端广播
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSignMode('tx')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeSignMode === 'tx'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            比特币交易签名
          </button>
          <button
            onClick={() => setActiveSignMode('message')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeSignMode === 'message'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            BIP137 文本消息签名
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Private Key Input Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>离线冷端私钥 (WIF 或 64位十六进制)</span>
          </div>
          <span className="text-[11px] text-slate-500">已在本地内存锁定，不上传任何节点</span>
        </div>
        <input
          type="password"
          value={privKeyInput}
          onChange={(e) => setPrivKeyInput(e.target.value)}
          placeholder="例如: 5HueCGU8rMjx1P... 或 e9873d79c6d87dc0fb6a5778633389f4453213303da61f20bd67fc233aa33262"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-rose-300 focus:outline-none focus:border-amber-500"
        />
      </div>

      {activeSignMode === 'tx' ? (
        /* Transaction Signer Form */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input & Output Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-semibold text-white">未花费交易输出 (UTXO Input)</span>
              <span className="text-xs text-slate-500">来源输入</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">前序交易哈希 (TXID - 64位十六进制)</label>
              <input
                type="text"
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">索引 (VOUT)</label>
                <input
                  type="number"
                  min="0"
                  value={vout}
                  onChange={(e) => setVout(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-slate-400 block mb-1">UTXO 输入金额 (BTC)</label>
                <input
                  type="text"
                  value={inputAmountBtc}
                  onChange={(e) => setInputAmountBtc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">输入脚本类型 (Script Type)</label>
              <select
                value={scriptType}
                onChange={(e) => setScriptType(e.target.value as 'p2sh-p2wpkh' | 'p2pkh' | 'p2wpkh')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="p2sh-p2wpkh">★ BIP49 P2SH-P2WPKH (3开头隔离见证兼容)</option>
                <option value="p2wpkh">BIP84 Native SegWit (bc1q开头)</option>
                <option value="p2pkh">BIP44 Legacy (1开头经典格式)</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <span className="text-sm font-semibold text-white block">目标收款与找零输出</span>

              <div>
                <label className="text-xs text-slate-400 block mb-1">接收方地址 (支持 3... / 1... / bc1q...)</label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">转账金额 (BTC)</label>
                  <input
                    type="text"
                    value={sendAmountBtc}
                    onChange={(e) => setSendAmountBtc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">预留矿工费 (Satoshis)</label>
                  <input
                    type="number"
                    value={feeSat}
                    onChange={(e) => setFeeSat(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">找零返回地址 (建议自持 3... 冷地址)</label>
                <input
                  type="text"
                  value={changeAddress}
                  onChange={(e) => setChangeAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleSignTransaction}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
            >
              <FileSignature className="w-4 h-4" />
              <span>立即在本地离线签署交易</span>
            </button>
          </div>

          {/* Signed Output Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-semibold text-white">已签名交易报文 (Raw Hex)</span>
              {signedTxResult && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  签名完成 · 已就绪
                </span>
              )}
            </div>

            {signedTxResult ? (
              <div className="space-y-4 animate-fade-in">
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-slate-500 block">虚拟体积 (vSize)</span>
                    <span className="font-mono text-white font-bold text-sm">{signedTxResult.vsize} vB</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-slate-500 block">实际矿工费</span>
                    <span className="font-mono text-amber-400 font-bold text-sm">{signedTxResult.feeSat} sat</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-slate-500 block">输入 / 输出</span>
                    <span className="font-mono text-white font-bold text-sm">
                      {signedTxResult.inputsCount} 进 / {signedTxResult.outputsCount} 出
                    </span>
                  </div>
                </div>

                {/* TXID */}
                <div>
                  <span className="text-xs text-slate-400 block mb-1">计算出的交易哈希 (TXID):</span>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-amber-300 break-all select-all">
                      {signedTxResult.txid}
                    </span>
                    <button
                      onClick={() => handleCopy(signedTxResult.txid, 'txid')}
                      className="text-xs text-slate-400 hover:text-white shrink-0"
                    >
                      {copiedKey === 'txid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Raw Transaction Hex */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>原始广播十六进制 (Raw Hex):</span>
                    <button
                      onClick={() => handleCopy(signedTxResult.rawTxHex, 'rawhex')}
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'rawhex' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'rawhex' ? '已复制报文' : '复制整段报文'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto custom-scrollbar font-mono text-xs text-slate-300 break-all select-all">
                    {signedTxResult.rawTxHex}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() =>
                      setQrModalData({
                        title: '离线签名交易二维码',
                        data: signedTxResult.rawTxHex,
                        subtitle: '使用联网热端设备 (如手机/全节点) 扫码广播至比特币网络',
                      })
                    }
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>显示广播二维码</span>
                  </button>

                  <button
                    onClick={handleDownloadTxFile}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>导出 .HEX 文件</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <FileSignature className="w-8 h-8 mb-2 text-slate-600 stroke-[1.5]" />
                <p className="text-xs text-slate-400 font-medium">尚未执行签名</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  在左侧配置 UTXO 及转账参数后，点击“立即在本地离线签署交易”即可生成完备签名
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Message Signer Form */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">BIP137 标准比特币消息签名 (所有权证明)</span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">声明文本内容 (Message)</label>
            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleSignMessage}
            className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>离线生成消息数字签名</span>
          </button>

          {signedMsgResult && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-fade-in text-xs">
              <div>
                <span className="text-slate-400 block mb-1">关联的 3 开头冷地址:</span>
                <p className="font-mono text-amber-400 bg-slate-950 p-2 rounded-lg break-all">
                  {signedMsgResult.address}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Base64 数字签名 (兼容 Electrum / Core):</span>
                  <button
                    onClick={() => handleCopy(signedMsgResult.signatureBase64, 'msgsig')}
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    {copiedKey === 'msgsig' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'msgsig' ? '已复制' : '复制签名'}</span>
                  </button>
                </div>
                <p className="font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg break-all">
                  {signedMsgResult.signatureBase64}
                </p>
              </div>
            </div>
          )}
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
