export interface WatchOnlyUTXO {
  id: string;
  txid: string;
  vout: number;
  amountSat: number;
  confirmed: boolean;
}

export interface WatchOnlyWalletItem {
  id: string;
  label: string;
  addressOrXpub: string;
  type: 'p2sh' | 'legacy' | 'segwit' | 'multisig' | 'xpub';
  derivationPath?: string;
  balanceSat: number;
  createdAt: number;
  notes?: string;
  utxos: WatchOnlyUTXO[];
}

const STORAGE_KEY = 'aegis_cold_watch_wallets_v1';

export function loadWatchWallets(): WatchOnlyWalletItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default initial cold wallet demo watch addresses
      return [
        {
          id: 'demo-1',
          label: '冷端主要金库 (BIP49 P2SH)',
          addressOrXpub: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
          type: 'p2sh',
          derivationPath: "m/49'/0'/0'/0/0",
          balanceSat: 15420000, // 0.1542 BTC
          createdAt: Date.now() - 86400000 * 5,
          notes: '隔离见证3开头地址，日常定投冷存',
          utxos: [
            {
              id: 'utxo-1',
              txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
              vout: 0,
              amountSat: 10000000,
              confirmed: true,
            },
            {
              id: 'utxo-2',
              txid: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              vout: 1,
              amountSat: 5420000,
              confirmed: true,
            },
          ],
        },
        {
          id: 'demo-2',
          label: '2-of-3 多重签名冷金库',
          addressOrXpub: '347N1Thc213QqfYCz3PZafpausefqic3R5',
          type: 'multisig',
          derivationPath: "m/49'/0'/0'/multisig",
          balanceSat: 50000000, // 0.5 BTC
          createdAt: Date.now() - 86400000 * 2,
          notes: '由两台离线安卓冷手机+硬件卡联合签发',
          utxos: [
            {
              id: 'utxo-3',
              txid: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
              vout: 0,
              amountSat: 50000000,
              confirmed: true,
            },
          ],
        },
      ];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveWatchWallets(items: WatchOnlyWalletItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save watch wallets to localStorage', e);
  }
}
