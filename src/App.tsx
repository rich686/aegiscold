import React, { useState, useEffect } from 'react';
import { WalletHome, AddressType } from './components/WalletHome.tsx';
import { SendModal } from './components/SendModal.tsx';
import { ReceiveModal } from './components/ReceiveModal.tsx';
import { KeyManagementModal } from './components/KeyManagementModal.tsx';
import { ImportKeyModal } from './components/ImportKeyModal.tsx';
import { WalletSelectorModal } from './components/WalletSelectorModal.tsx';
import { WatchWalletManager } from './components/WatchWalletManager.tsx';
import { TransactionHistoryView } from './components/TransactionHistoryView.tsx';
import { AdvancedSettingsView } from './components/AdvancedSettingsView.tsx';
import {
  generateSecureEntropy,
  generateMnemonicFromEntropy,
  calculateShannonEntropy,
  BitcoinHDWallet,
  DerivedAddress,
  ParsedKeyImport
} from './crypto/bitcoin.ts';
import {
  WatchOnlyWalletItem,
  loadWatchWallets,
  saveWatchWallets
} from './types/watchWallet.ts';
import {
  GeneratedAddressRecord,
  loadAddressRecords,
  saveAddressRecords
} from './types/addressRecord.ts';
import {
  Wallet,
  Eye,
  History,
  Settings,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  // Navigation: 4 bottom tabs (Home, Watch, History, Settings)
  const [activeTab, setActiveTab] = useState<'home' | 'watch' | 'history' | 'settings'>('home');
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : false
  );

  // Key & HD Wallet state
  const [mnemonic, setMnemonic] = useState<string>('');
  const [hdWallet, setHdWallet] = useState<BitcoinHDWallet | null>(null);
  const [currentAddress, setCurrentAddress] = useState<DerivedAddress | null>(null);
  const [addressIndex, setAddressIndex] = useState<number>(0);
  const [derivationPath, setDerivationPath] = useState<string>("m/49'/0'/0'/0");
  const [addressType, setAddressType] = useState<AddressType>('bip49');
  const [shannonScore, setShannonScore] = useState<number>(7.985);

  // Generated address records history (persisted in localStorage)
  const [addressRecords, setAddressRecords] = useState<GeneratedAddressRecord[]>(() =>
    loadAddressRecords()
  );

  // Balance & Watch Wallets
  const [balanceSat, setBalanceSat] = useState<number>(15420000); // 0.1542 BTC
  const [wallets, setWallets] = useState<WatchOnlyWalletItem[]>(() => loadWatchWallets());
  const [activeWalletId, setActiveWalletId] = useState<string>('primary-cold');
  const [walletName, setWalletName] = useState<string>('默认比特币主钱包');

  // Modals
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isKeyMgmtOpen, setIsKeyMgmtOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWalletSelectOpen, setIsWalletSelectOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to record any newly generated address in history
  const recordAddressGeneration = (derived: DerivedAddress) => {
    setAddressRecords((prev) => {
      // Check if this address is already recorded
      if (prev.some((r) => r.addressP2SH === derived.addressP2SH)) {
        return prev;
      }
      const newRec: GeneratedAddressRecord = {
        id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        index: derived.index,
        addressP2SH: derived.addressP2SH,
        addressBech32: derived.addressBech32,
        addressLegacy: derived.addressLegacy,
        path: derived.path,
        privKeyHex: derived.privKeyHex,
        wif: derived.wif,
        createdAt: Date.now(),
      };
      const updated = [newRec, ...prev];
      saveAddressRecords(updated);
      return updated;
    });
  };

  // Delete address record with dedicated action
  const handleDeleteAddressRecord = (id: string) => {
    setAddressRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      const updated = prev.filter((r) => r.id !== id);
      saveAddressRecords(updated);
      showToast(`已删除地址记录 ${target ? '#' + target.index : ''}`);
      return updated;
    });
  };

  // Set selected record as active main address
  const handleSelectActiveAddress = (record: GeneratedAddressRecord) => {
    setCurrentAddress({
      path: record.path,
      index: record.index,
      addressP2SH: record.addressP2SH,
      addressLegacy: record.addressLegacy,
      addressBech32: record.addressBech32,
      pubKeyHex: '',
      pubKeyHash160: '',
      redeemScriptHex: '',
      privKeyHex: record.privKeyHex,
      wif: record.wif,
    });
    showToast(`已将 #${record.index} 设为主收款地址`);
  };

  // Generate wallet initially
  const initOrGenerateWallet = (customMnemonic?: string, path = derivationPath) => {
    try {
      let m = customMnemonic;
      if (!m) {
        const entropy = generateSecureEntropy(128);
        setShannonScore(calculateShannonEntropy(entropy));
        m = generateMnemonicFromEntropy(entropy);
      }
      setMnemonic(m);

      const hd = new BitcoinHDWallet(m, '', path);
      setHdWallet(hd);
      const derived = hd.deriveChild(0, path);
      setCurrentAddress(derived);
      recordAddressGeneration(derived);
    } catch (e) {
      console.error('Wallet generation error:', e);
    }
  };

  useEffect(() => {
    initOrGenerateWallet();
  }, []);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Switch displayed address type for the same mnemonic/wallet
  const handleAddressTypeChange = (type: AddressType) => {
    setAddressType(type);
    let targetPath = derivationPath;
    if (type === 'bip49') targetPath = "m/49'/0'/0'/0";
    else if (type === 'bip84') targetPath = "m/84'/0'/0'/0";
    else if (type === 'bip44') targetPath = "m/44'/0'/0'/0";

    setDerivationPath(targetPath);
    if (hdWallet && mnemonic) {
      try {
        const hd = new BitcoinHDWallet(mnemonic, '', targetPath);
        setHdWallet(hd);
        const derived = hd.deriveChild(addressIndex, targetPath);
        setCurrentAddress(derived);
        recordAddressGeneration(derived);
        const label =
          type === 'bip49'
            ? 'BIP49 (3开头隔离见证)'
            : type === 'bip84'
            ? 'BIP84 (bc1q 原生隔离见证)'
            : 'BIP44 (1开头传统标准)';
        showToast(`已切换展示 ${label}`);
      } catch (err) {
        console.error(err);
      }
    } else {
      const label =
        type === 'bip49'
          ? 'BIP49 (3开头)'
          : type === 'bip84'
          ? 'BIP84 (bc1q)'
          : 'BIP44 (1开头)';
      showToast(`已切换展示 ${label}`);
    }
  };

  // Switch HD derivation path
  const handlePathChange = (newPath: string) => {
    setDerivationPath(newPath);
    // Auto sync addressType if matching standard path
    if (newPath.startsWith("m/84'")) setAddressType('bip84');
    else if (newPath.startsWith("m/44'")) setAddressType('bip44');
    else if (newPath.startsWith("m/49'")) setAddressType('bip49');

    if (hdWallet && mnemonic) {
      try {
        const hd = new BitcoinHDWallet(mnemonic, '', newPath);
        setHdWallet(hd);
        const derived = hd.deriveChild(addressIndex, newPath);
        setCurrentAddress(derived);
        recordAddressGeneration(derived);
        showToast(`已切换 HD 路径并生成地址: ${newPath}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Derive next random address
  const handleNewRandomAddress = () => {
    if (hdWallet) {
      const nextIndex = addressIndex + 1;
      setAddressIndex(nextIndex);
      const derived = hdWallet.deriveChild(nextIndex, derivationPath);
      setCurrentAddress(derived);
      recordAddressGeneration(derived);
      showToast(`已生成 3 开头新地址 #${nextIndex} 并记入台账`);
    } else {
      initOrGenerateWallet();
    }
  };

  // Add current address to watch wallet
  const handleAddCurrentToWatch = () => {
    if (!currentAddress) return;
    const exists = wallets.some((w) => w.addressOrXpub === currentAddress.addressP2SH);
    if (exists) {
      showToast('该 3 开头地址已在观察钱包中');
      return;
    }
    const newWatch: WatchOnlyWalletItem = {
      id: 'watch-' + Date.now(),
      label: `冷地址 #${currentAddress.index} (BIP49)`,
      addressOrXpub: currentAddress.addressP2SH,
      type: 'p2sh',
      derivationPath: currentAddress.path,
      balanceSat: balanceSat,
      createdAt: Date.now(),
      notes: '从主界面一键导入',
      utxos: [
        {
          id: 'utxo-' + Date.now(),
          txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
          vout: 0,
          amountSat: balanceSat,
          confirmed: true,
        },
      ],
    };
    const updated = [newWatch, ...wallets];
    setWallets(updated);
    saveWatchWallets(updated);
    showToast('成功添加至观察钱包！');
  };

  // Direct send completion
  const handleConfirmSend = (toAddress: string, amountSat: number, feeSat: number) => {
    const newBal = Math.max(0, balanceSat - amountSat - feeSat);
    setBalanceSat(newBal);
    showToast(`转账已成功执行！已汇出 ${(amountSat / 100_000_000).toFixed(8)} BTC`);
  };

  return (
    <div className="min-h-screen bg-[#060b14] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3 pb-24 flex flex-col justify-start">
        {activeTab === 'home' && (
          <WalletHome
            currentAddress={currentAddress}
            balanceSat={balanceSat}
            isOnline={isOnline}
            walletName={walletName}
            addressRecordsCount={addressRecords.length}
            addressType={addressType}
            onAddressTypeChange={handleAddressTypeChange}
            onOpenSend={() => setIsSendOpen(true)}
            onOpenReceive={() => setIsReceiveOpen(true)}
            onOpenKeyManagement={() => setIsKeyMgmtOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenAddWatch={handleAddCurrentToWatch}
            onNewRandomAddress={handleNewRandomAddress}
            onSwitchWalletModal={() => setIsWalletSelectOpen(true)}
            onViewAddressRecords={() => setActiveTab('history')}
          />
        )}

        {activeTab === 'watch' && (
          <div className="space-y-4">
            <WatchWalletManager
              wallets={wallets}
              onWalletsChange={(updated) => {
                setWallets(updated);
                saveWatchWallets(updated);
              }}
              onInitiateTx={(addr) => {
                setIsSendOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <TransactionHistoryView
            balanceSat={balanceSat}
            currentAddress={currentAddress?.addressP2SH || ''}
            wallets={wallets}
            addressRecords={addressRecords}
            onDeleteAddressRecord={handleDeleteAddressRecord}
            onSelectActiveAddress={handleSelectActiveAddress}
            onInitiateSend={(addr) => {
              setIsSendOpen(true);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <AdvancedSettingsView
            wallets={wallets}
            onWalletsChange={(updated) => {
              setWallets(updated);
              saveWatchWallets(updated);
            }}
            onAddToWatch={(item) => {
              const updated = [
                {
                  ...item,
                  id: 'watch-' + Date.now(),
                  createdAt: Date.now(),
                },
                ...wallets,
              ];
              setWallets(updated);
              saveWatchWallets(updated);
              showToast('已添加观察钱包！');
            }}
            onInitiateTx={(addr) => {
              setIsSendOpen(true);
            }}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar: 4 Tabs (Home, Watch, History, Settings) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#060b14]/95 backdrop-blur-md border-t border-slate-800/80 pb-safe">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center h-16">
          {/* Tab 1: 钱包主页 */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center h-full gap-1 transition-colors cursor-pointer ${
              activeTab === 'home' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Wallet className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">钱包主页</span>
          </button>

          {/* Tab 2: 观察钱包 */}
          <button
            onClick={() => setActiveTab('watch')}
            className={`flex flex-col items-center justify-center h-full gap-1 transition-colors cursor-pointer ${
              activeTab === 'watch' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Eye className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">观察钱包</span>
          </button>

          {/* Tab 3: 台账与记录 */}
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center h-full gap-1 transition-colors cursor-pointer ${
              activeTab === 'history' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <History className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">台账与记录</span>
          </button>

          {/* Tab 4: 系统设置 */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center h-full gap-1 transition-colors cursor-pointer ${
              activeTab === 'settings' ? 'text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Settings className="w-5 h-5 stroke-[2]" />
            <span className="text-[11px] tracking-tight">系统设置</span>
          </button>
        </div>
      </nav>

      {/* Modals & Dialogs */}
      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        senderAddress={currentAddress?.addressP2SH || ''}
        senderBalanceSat={balanceSat}
        onConfirmSend={handleConfirmSend}
      />

      <ReceiveModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        currentAddress={currentAddress}
        initialFormat={addressType}
      />

      <KeyManagementModal
        isOpen={isKeyMgmtOpen}
        onClose={() => setIsKeyMgmtOpen(false)}
        mnemonic={mnemonic}
        derivedAddress={currentAddress}
        addressRecords={addressRecords}
        onSelectActiveAddress={handleSelectActiveAddress}
        shannonScore={shannonScore}
        currentPath={derivationPath}
        onPathChange={handlePathChange}
        onRegenerate={() => initOrGenerateWallet()}
      />

      <ImportKeyModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onConfirmImport={(parsed: ParsedKeyImport) => {
          if (parsed.type === 'mnemonic' && parsed.mnemonic) {
            initOrGenerateWallet(parsed.mnemonic, parsed.derivationPath || derivationPath);
            setWalletName('已导入助记词冷金库');
            showToast('助记词导入成功！已派生 3 开头金库地址');
          } else {
            // Direct private key import (WIF / Raw Hex / MiniKey)
            const derived = {
              path: '导入私钥 (单地址)',
              index: 0,
              addressP2SH: parsed.addressP2SH,
              addressLegacy: parsed.addressLegacy,
              addressBech32: parsed.addressBech32,
              pubKeyHex: parsed.pubKeyHex,
              pubKeyHash160: '',
              redeemScriptHex: '',
              privKeyHex: parsed.privKeyHex,
              wif: parsed.wif,
            };
            setCurrentAddress(derived);
            recordAddressGeneration(derived);
            setWalletName(`冷钱包 (${parsed.typeLabel})`);
            showToast(`私钥导入成功！已切换至 ${parsed.typeLabel}`);
          }
        }}
      />

      <WalletSelectorModal
        isOpen={isWalletSelectOpen}
        onClose={() => setIsWalletSelectOpen(false)}
        activeWalletId={activeWalletId}
        onSelectWallet={(id) => {
          setActiveWalletId(id);
          if (id === 'primary-cold') {
            setWalletName('默认比特币主钱包');
          } else {
            const found = wallets.find((w) => w.id === id);
            if (found) {
              setWalletName(found.label);
              setBalanceSat(found.balanceSat);
            }
          }
        }}
        watchWallets={wallets}
        onAddNewWallet={() => initOrGenerateWallet()}
      />
    </div>
  );
}
