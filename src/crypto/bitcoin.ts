import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as secp from '@noble/secp256k1';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist as englishWordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';

// Base58 characters table for Bitcoin Base58Check
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Base58 encode a byte array
 */
export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  // Convert to BigInt
  let num = 0n;
  for (let i = 0; i < bytes.length; i++) {
    num = (num << 8n) + BigInt(bytes[i]);
  }

  let str = '';
  while (num > 0n) {
    const rem = Number(num % 58n);
    num = num / 58n;
    str = B58_ALPHABET[rem] + str;
  }

  // Prepend '1' for each leading zero byte
  return '1'.repeat(zeros) + str;
}

/**
 * Base58 decode a string
 */
export function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') {
    zeros++;
  }

  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const idx = B58_ALPHABET.indexOf(str[i]);
    if (idx === -1) throw new Error(`Invalid Base58 character: ${str[i]}`);
    num = num * 58n + BigInt(idx);
  }

  const hex = num.toString(16);
  const paddedHex = hex.length % 2 !== 0 ? '0' + hex : hex;
  const bytes = hexToBytes(paddedHex);

  const res = new Uint8Array(zeros + bytes.length);
  res.set(bytes, zeros);
  return res;
}

/**
 * Double SHA-256 hash
 */
export function hash256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

/**
 * Hash160: RIPEMD160(SHA256(data))
 */
export function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/**
 * Base58Check Encode: Data + 4 bytes Checksum (SHA256(SHA256(data))[0..4])
 */
export function base58CheckEncode(payload: Uint8Array): string {
  const checksum = hash256(payload).slice(0, 4);
  const full = new Uint8Array(payload.length + 4);
  full.set(payload, 0);
  full.set(checksum, payload.length);
  return base58Encode(full);
}

/**
 * Base58Check Decode with checksum validation
 */
export function base58CheckDecode(str: string): Uint8Array {
  const bytes = base58Decode(str);
  if (bytes.length < 4) throw new Error('Base58Check: Data too short');
  const payload = bytes.slice(0, bytes.length - 4);
  const checksum = bytes.slice(bytes.length - 4);
  const calculated = hash256(payload).slice(0, 4);
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== calculated[i]) throw new Error('Base58Check checksum mismatch');
  }
  return payload;
}

/**
 * Bech32 / Bech32m encoder for Native Segwit (bc1q) and Taproot (bc1p)
 */
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    if ((top >> 0) & 1) chk ^= 0x3b6a57b2;
    if ((top >> 1) & 1) chk ^= 0x26508e6d;
    if ((top >> 2) & 1) chk ^= 0x1ea119fa;
    if ((top >> 3) & 1) chk ^= 0x3d4233dd;
    if ((top >> 4) & 1) chk ^= 0x2a1462b3;
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

function convertBits(data: Uint8Array, frombits: number, tobits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << tobits) - 1;
  for (let p = 0; p < data.length; ++p) {
    const value = data[p];
    acc = (acc << frombits) | value;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (tobits - bits)) & maxv);
    }
  } else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) {
    throw new Error('Bits conversion failure');
  }
  return ret;
}

export function encodeSegwitAddress(hrp: string, version: number, program: Uint8Array): string {
  const words = [version, ...convertBits(program, 8, 5, true)];
  const enc = bech32HrpExpand(hrp).concat(words);
  const polymod = bech32Polymod(enc.concat([0, 0, 0, 0, 0, 0])) ^ 1;
  const checksum: number[] = [];
  for (let i = 0; i < 6; ++i) {
    checksum.push((polymod >> (5 * (5 - i))) & 31);
  }
  let ret = hrp + '1';
  for (let i = 0; i < words.length; ++i) {
    ret += BECH32_CHARSET.charAt(words[i]);
  }
  for (let i = 0; i < checksum.length; ++i) {
    ret += BECH32_CHARSET.charAt(checksum[i]);
  }
  return ret;
}

/**
 * Convert 32-byte private key into WIF (Wallet Import Format, compressed)
 */
export function privateKeyToWIF(privKey: Uint8Array, networkPrefix = 0x80): string {
  // 0x80 + 32-byte privkey + 0x01 (compressed flag)
  const payload = new Uint8Array(34);
  payload[0] = networkPrefix;
  payload.set(privKey, 1);
  payload[33] = 0x01;
  return base58CheckEncode(payload);
}

/**
 * Address derivation models
 */
export interface DerivedAddress {
  path: string;
  index: number;
  addressP2SH: string; // Starts with 3 (BIP49 Nested SegWit P2SH-P2WPKH)
  addressLegacy: string; // Starts with 1 (BIP44 P2PKH)
  addressBech32: string; // Starts with bc1q (BIP84 Native SegWit)
  pubKeyHex: string;
  pubKeyHash160: string;
  redeemScriptHex: string; // For P2SH
  privKeyHex: string;
  wif: string;
}

/**
 * Calculate BIP49 Nested SegWit (P2SH-P2WPKH) Address
 * Starts with '3'
 */
export function pubkeyToP2SH_P2WPKH(pubKey: Uint8Array): {
  address: string;
  pubKeyHash: string;
  redeemScript: string;
} {
  // 1. Hash160 of public key: 20 bytes
  const pkh = hash160(pubKey);

  // 2. BIP141 witness script for P2WPKH: OP_0 (0x00) + PUSH20 (0x14) + 20-byte hash160 = 22 bytes
  const redeemScript = new Uint8Array(22);
  redeemScript[0] = 0x00;
  redeemScript[1] = 0x14;
  redeemScript.set(pkh, 2);

  // 3. Hash160 of the redeem script: 20 bytes
  const scriptHash = hash160(redeemScript);

  // 4. Base58Check with 0x05 prefix (Bitcoin Mainnet P2SH)
  const payload = new Uint8Array(21);
  payload[0] = 0x05; // 0x05 prefix produces '3...' addresses in Base58Check
  payload.set(scriptHash, 1);

  const address = base58CheckEncode(payload);

  return {
    address,
    pubKeyHash: bytesToHex(pkh),
    redeemScript: bytesToHex(redeemScript),
  };
}

/**
 * Calculate BIP44 Legacy P2PKH Address
 * Starts with '1'
 */
export function pubkeyToP2PKH(pubKey: Uint8Array): string {
  const pkh = hash160(pubKey);
  const payload = new Uint8Array(21);
  payload[0] = 0x00; // 0x00 prefix produces '1...' addresses in Base58Check
  payload.set(pkh, 1);
  return base58CheckEncode(payload);
}

/**
 * Calculate BIP84 Native SegWit P2WPKH Address
 * Starts with 'bc1q'
 */
export function pubkeyToP2WPKH(pubKey: Uint8Array, hrp = 'bc'): string {
  const pkh = hash160(pubKey);
  return encodeSegwitAddress(hrp, 0, pkh);
}

/**
 * Shannon Entropy calculation (bits per byte)
 * Theoretical maximum is 8.0 bits/byte for uniform random distribution
 */
export function calculateShannonEntropy(data: Uint8Array): number {
  if (data.length === 0) return 0;
  const freq: { [key: number]: number } = {};
  for (let i = 0; i < data.length; i++) {
    freq[data[i]] = (freq[data[i]] || 0) + 1;
  }
  let entropy = 0;
  const len = data.length;
  for (const byte in freq) {
    const p = freq[byte] / len;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(4));
}

/**
 * Entropy generation with optional dice / coin rolls
 */
export function generateSecureEntropy(
  strength: 128 | 256 = 256,
  userEntropyHex?: string
): Uint8Array {
  const byteCount = strength / 8;
  const systemBytes = new Uint8Array(byteCount);
  crypto.getRandomValues(systemBytes);

  if (!userEntropyHex || userEntropyHex.trim() === '') {
    return systemBytes;
  }

  // Combine system entropy with user physical entropy using SHA256 / HMAC
  const cleanHex = userEntropyHex.replace(/[^0-9a-fA-F]/g, '');
  const userBytes = hexToBytes(cleanHex.length % 2 !== 0 ? cleanHex + '0' : cleanHex);

  const combined = new Uint8Array(systemBytes.length + userBytes.length);
  combined.set(systemBytes, 0);
  combined.set(userBytes, systemBytes.length);

  // Hash to obtain uniformly distributed output
  const digest = sha256(combined);
  return digest.slice(0, byteCount);
}

/**
 * Generate Mnemonic from entropy
 */
export function generateMnemonicFromEntropy(entropy: Uint8Array): string {
  const strength = (entropy.length * 8) as 128 | 256;
  if (strength !== 128 && strength !== 256) {
    throw new Error('Entropy length must be 16 bytes (128 bits) or 32 bytes (256 bits)');
  }
  return generateMnemonic(englishWordlist, strength);
}

/**
 * Full HD Wallet Derivation Context
 */
export class BitcoinHDWallet {
  public mnemonic: string;
  public seed: Uint8Array;
  public masterKey: HDKey;
  public rootPath: string;

  constructor(mnemonic: string, passphrase = '', defaultPath = "m/49'/0'/0'/0") {
    if (!validateMnemonic(mnemonic, englishWordlist)) {
      throw new Error('Invalid BIP39 mnemonic phrase');
    }
    this.mnemonic = mnemonic;
    this.seed = mnemonicToSeedSync(mnemonic, passphrase);
    this.masterKey = HDKey.fromMasterSeed(this.seed);
    this.rootPath = defaultPath;
  }

  /**
   * Derive key and address at specific index
   */
  public deriveChild(index: number, basePath = this.rootPath): DerivedAddress {
    // Clean path
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
    const fullPath = `${cleanBase}/${index}`;
    const childKey = this.masterKey.derive(fullPath);

    if (!childKey.privateKey || !childKey.publicKey) {
      throw new Error(`Failed to derive child keys for path ${fullPath}`);
    }

    const pubKey = childKey.publicKey;
    const privKey = childKey.privateKey;

    const p2sh = pubkeyToP2SH_P2WPKH(pubKey);
    const legacy = pubkeyToP2PKH(pubKey);
    const bech32 = pubkeyToP2WPKH(pubKey);
    const wif = privateKeyToWIF(privKey);

    return {
      path: fullPath,
      index,
      addressP2SH: p2sh.address,
      addressLegacy: legacy,
      addressBech32: bech32,
      pubKeyHex: bytesToHex(pubKey),
      pubKeyHash160: p2sh.pubKeyHash,
      redeemScriptHex: p2sh.redeemScript,
      privKeyHex: bytesToHex(privKey),
      wif,
    };
  }

  /**
   * Batch derive addresses (e.g., first 5 or 10 addresses)
   */
  public deriveBatch(count = 5, startIndex = 0, basePath = this.rootPath): DerivedAddress[] {
    const list: DerivedAddress[] = [];
    for (let i = 0; i < count; i++) {
      list.push(this.deriveChild(startIndex + i, basePath));
    }
    return list;
  }

  /**
   * Get Extended Public Key (xpub / ypub / zpub serialization)
   */
  public getAccountExtendedPublicKey(accountPath = "m/49'/0'/0'"): string {
    const acc = this.masterKey.derive(accountPath);
    return acc.publicExtendedKey;
  }
}

export type ImportKeyType = 'mnemonic' | 'wif-compressed' | 'wif-uncompressed' | 'hex' | 'minikey';

export interface ParsedKeyImport {
  type: ImportKeyType;
  typeLabel: string;
  privKeyHex: string;
  wif: string;
  pubKeyHex: string;
  addressP2SH: string; // 3... address
  addressBech32: string; // bc1q...
  addressLegacy: string; // 1...
  mnemonic?: string;
  derivationPath?: string;
}

/**
 * Multi-format Bitcoin Private Key & Mnemonic Parser
 * Supports:
 * 1. BIP39 Mnemonic (12, 18, 24 words)
 * 2. WIF Compressed (starts with K or L)
 * 3. WIF Uncompressed (starts with 5)
 * 4. Raw Hex Private Key (64 hex characters)
 * 5. Casascius MiniKey (starts with S)
 */
export function parsePrivateKeyOrMnemonic(
  input: string,
  passphrase = '',
  derivationPath = "m/49'/0'/0'/0/0"
): ParsedKeyImport {
  const clean = input.trim();
  if (!clean) throw new Error('输入内容不能为空');

  // 1. Try BIP39 Mnemonic
  const words = clean.toLowerCase().replace(/\s+/g, ' ').split(' ');
  if ([12, 15, 18, 21, 24].includes(words.length)) {
    const phrase = words.join(' ');
    if (validateMnemonic(phrase, englishWordlist)) {
      const hd = new BitcoinHDWallet(phrase, passphrase);
      const child = hd.deriveChild(0, derivationPath.replace(/\/\d+$/, ''));
      return {
        type: 'mnemonic',
        typeLabel: `BIP39 助记词 (${words.length} 词)`,
        privKeyHex: child.privKeyHex,
        wif: child.wif,
        pubKeyHex: child.pubKeyHex,
        addressP2SH: child.addressP2SH,
        addressBech32: child.addressBech32,
        addressLegacy: child.addressLegacy,
        mnemonic: phrase,
        derivationPath,
      };
    }
  }

  // 2. Try WIF (Base58Check)
  if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(clean)) {
    try {
      const decoded = base58CheckDecode(clean);
      if (decoded[0] === 0x80) {
        // Mainnet private key
        let privBytes: Uint8Array;
        let isCompressed = false;
        let typeLabel = '';
        let type: ImportKeyType = 'wif-compressed';

        if (decoded.length === 34 && decoded[33] === 0x01) {
          // Compressed WIF (starts with K or L)
          privBytes = decoded.slice(1, 33);
          isCompressed = true;
          typeLabel = 'WIF 压缩私钥 (K/L 开头)';
          type = 'wif-compressed';
        } else if (decoded.length === 33) {
          // Uncompressed WIF (starts with 5)
          privBytes = decoded.slice(1);
          isCompressed = false;
          typeLabel = 'WIF 未压缩私钥 (5 开头)';
          type = 'wif-uncompressed';
        } else {
          throw new Error('无效的 WIF 字节长度');
        }

        const pubKey = secp.getPublicKey(privBytes, true); // derive compressed for modern 3... addresses
        const p2sh = pubkeyToP2SH_P2WPKH(pubKey);
        const legacy = pubkeyToP2PKH(pubKey);
        const bech32 = pubkeyToP2WPKH(pubKey);
        const wif = privateKeyToWIF(privBytes);

        return {
          type,
          typeLabel,
          privKeyHex: bytesToHex(privBytes),
          wif,
          pubKeyHex: bytesToHex(pubKey),
          addressP2SH: p2sh.address,
          addressBech32: bech32,
          addressLegacy: legacy,
        };
      }
    } catch (e: unknown) {
      if (clean.startsWith('5') || clean.startsWith('K') || clean.startsWith('L')) {
        throw new Error('WIF 私钥校验和或字符格式错误');
      }
    }
  }

  // 3. Try Raw 64 Hex characters
  const hexClean = clean.replace(/^0x/i, '');
  if (/^[0-9a-fA-F]{64}$/.test(hexClean)) {
    const privBytes = hexToBytes(hexClean.toLowerCase());
    const pubKey = secp.getPublicKey(privBytes, true);
    const p2sh = pubkeyToP2SH_P2WPKH(pubKey);
    const legacy = pubkeyToP2PKH(pubKey);
    const bech32 = pubkeyToP2WPKH(pubKey);
    const wif = privateKeyToWIF(privBytes);

    return {
      type: 'hex',
      typeLabel: '64 位十六进制原始私钥 (Raw Hex)',
      privKeyHex: hexClean.toLowerCase(),
      wif,
      pubKeyHex: bytesToHex(pubKey),
      addressP2SH: p2sh.address,
      addressBech32: bech32,
      addressLegacy: legacy,
    };
  }

  // 4. Try Casascius MiniKey (starts with S, 22 or 30 chars)
  if (/^S[1-9A-HJ-NP-Za-km-z]{21,29}$/.test(clean)) {
    // MiniKey validation: SHA256(clean + '?')[0] === 0x00
    const testBytes = new TextEncoder().encode(clean + '?');
    const testHash = sha256(testBytes);
    if (testHash[0] === 0x00) {
      const privBytes = sha256(new TextEncoder().encode(clean));
      const pubKey = secp.getPublicKey(privBytes, true);
      const p2sh = pubkeyToP2SH_P2WPKH(pubKey);
      const legacy = pubkeyToP2PKH(pubKey);
      const bech32 = pubkeyToP2WPKH(pubKey);
      const wif = privateKeyToWIF(privBytes);

      return {
        type: 'minikey',
        typeLabel: 'Casascius 实体迷你私钥 (MiniKey)',
        privKeyHex: bytesToHex(privBytes),
        wif,
        pubKeyHex: bytesToHex(pubKey),
        addressP2SH: p2sh.address,
        addressBech32: bech32,
        addressLegacy: legacy,
      };
    } else {
      throw new Error('MiniKey 校验和测试失败 (SHA256 首字节非 0x00)');
    }
  }

  throw new Error('无法识别该格式：请提供合法的 BIP39 助记词、WIF 密匙 (K/L/5开头) 或 64 位十六进制私钥');
}
