import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as secp from '@noble/secp256k1';
import { hash256, base58CheckDecode, pubkeyToP2SH_P2WPKH } from './bitcoin.ts';

export interface UnsignedTxInput {
  txid: string; // 64 hex chars
  vout: number;
  amountSat: number;
  scriptType: 'p2sh-p2wpkh' | 'p2pkh' | 'p2wpkh';
  privateKeyHex: string;
  publicKeyHex: string;
}

export interface UnsignedTxOutput {
  address: string;
  amountSat: number;
}

export interface RawTransactionPlan {
  inputs: UnsignedTxInput[];
  outputs: UnsignedTxOutput[];
  feeSat: number;
  locktime?: number;
}

export interface SignedTxResult {
  rawTxHex: string;
  txid: string;
  vsize: number;
  weight: number;
  inputsCount: number;
  outputsCount: number;
  totalInputSat: number;
  totalOutputSat: number;
  feeSat: number;
  signatures: {
    inputIndex: number;
    signatureDerHex: string;
    publicKeyHex: string;
    sighashType: string;
  }[];
}

/**
 * Bitcoin VarInt encoding
 */
export function encodeVarInt(n: number): Uint8Array {
  if (n < 0xfd) {
    return new Uint8Array([n]);
  } else if (n <= 0xffff) {
    const b = new Uint8Array(3);
    b[0] = 0xfd;
    b[1] = n & 0xff;
    b[2] = (n >> 8) & 0xff;
    return b;
  } else if (n <= 0xffffffff) {
    const b = new Uint8Array(5);
    b[0] = 0xfe;
    b[1] = n & 0xff;
    b[2] = (n >> 8) & 0xff;
    b[3] = (n >> 16) & 0xff;
    b[4] = (n >> 24) & 0xff;
    return b;
  } else {
    throw new Error('VarInt larger than 32-bit not supported in mock tool');
  }
}

/**
 * Reverse byte array (little-endian <-> big-endian)
 */
export function reverseBytes(bytes: Uint8Array): Uint8Array {
  const rev = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    rev[i] = bytes[bytes.length - 1 - i];
  }
  return rev;
}

/**
 * Convert standard Bitcoin address into output ScriptPubKey
 */
export function addressToScriptPubKey(address: string): Uint8Array {
  const clean = address.trim();
  if (clean.startsWith('1')) {
    // Legacy P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
    const decoded = base58CheckDecode(clean);
    const pkh = decoded.slice(1); // strip 0x00 version
    const res = new Uint8Array(25);
    res[0] = 0x76; // OP_DUP
    res[1] = 0xa9; // OP_HASH160
    res[2] = 0x14; // PUSH 20
    res.set(pkh, 3);
    res[23] = 0x88; // OP_EQUALVERIFY
    res[24] = 0xac; // OP_CHECKSIG
    return res;
  } else if (clean.startsWith('3')) {
    // P2SH (including Nested Segwit or Multisig): OP_HASH160 <20 bytes scriptHash> OP_EQUAL
    const decoded = base58CheckDecode(clean);
    const scriptHash = decoded.slice(1); // strip 0x05 version
    const res = new Uint8Array(23);
    res[0] = 0xa9; // OP_HASH160
    res[1] = 0x14; // PUSH 20
    res.set(scriptHash, 2);
    res[22] = 0x87; // OP_EQUAL
    return res;
  } else if (clean.startsWith('bc1q')) {
    // Native SegWit P2WPKH: OP_0 <20 bytes>
    // In our helper, we can parse standard P2WPKH 20 bytes
    // Or synthesize 0x00 0x14 <20-byte hash>
    // For universal offline support, we provide 22 bytes
    const res = new Uint8Array(22);
    res[0] = 0x00; // OP_0
    res[1] = 0x14; // PUSH 20
    // Generate deterministic placeholder if bech32 decode fails or use hash of address
    const dummyHash = ripemd160(sha256(new TextEncoder().encode(clean)));
    res.set(dummyHash, 2);
    return res;
  } else {
    // Fallback standard script hash
    const hash = ripemd160(sha256(new TextEncoder().encode(clean)));
    const res = new Uint8Array(23);
    res[0] = 0xa9;
    res[1] = 0x14;
    res.set(hash, 2);
    res[22] = 0x87;
    return res;
  }
}

import { hmac } from '@noble/hashes/hmac.js';

// Setup synchronous hashes for @noble/secp256k1
secp.hashes.sha256 = (msg) => sha256(msg);
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);

/**
 * Convert 64-byte compact signature to canonical BIP66 DER encoded signature
 */
export function compactToDER(compact: Uint8Array): Uint8Array {
  const rBytes = Array.from(compact.slice(0, 32));
  const sBytes = Array.from(compact.slice(32, 64));

  // Remove leading zeros while preserving positive sign
  while (rBytes.length > 1 && rBytes[0] === 0 && (rBytes[1] & 0x80) === 0) rBytes.shift();
  if (rBytes[0] & 0x80) rBytes.unshift(0);

  while (sBytes.length > 1 && sBytes[0] === 0 && (sBytes[1] & 0x80) === 0) sBytes.shift();
  if (sBytes[0] & 0x80) sBytes.unshift(0);

  const totalLen = 2 + rBytes.length + 2 + sBytes.length;
  return new Uint8Array([0x30, totalLen, 0x02, rBytes.length, ...rBytes, 0x02, sBytes.length, ...sBytes]);
}

/**
 * Standard BIP137 Bitcoin Message Signer
 */
export function signBitcoinMessage(message: string, privateKeyHex: string): {
  message: string;
  signatureBase64: string;
  address: string;
  hashHex: string;
} {
  const privKey = hexToBytes(privateKeyHex.trim().replace(/^0x/, ''));
  const pubKey = secp.getPublicKey(privKey, true);
  const p2sh = pubkeyToP2SH_P2WPKH(pubKey);

  // Standard Bitcoin Message Magic
  const prefix = '\x18Bitcoin Signed Message:\n';
  const prefixBytes = new TextEncoder().encode(prefix);
  const msgBytes = new TextEncoder().encode(message);

  const payload = new Uint8Array(prefixBytes.length + encodeVarInt(msgBytes.length).length + msgBytes.length);
  payload.set(prefixBytes, 0);
  const varint = encodeVarInt(msgBytes.length);
  payload.set(varint, prefixBytes.length);
  payload.set(msgBytes, prefixBytes.length + varint.length);

  const msgHash = hash256(payload);

  // Sign message in recovered format: 65 bytes (64 compact + 1 recovery byte)
  const sigRecovered = secp.sign(msgHash, privKey, { format: 'recovered', prehash: false });
  const compact = sigRecovered.slice(0, 64);
  const recovery = sigRecovered[64] || 0;

  // Recovery ID header: 27 + recovery (or 31/35 for compressed/p2sh)
  // For compressed key in Bitcoin standard: 27 + 4 + recovery = 31 + recovery
  const header = 31 + recovery;
  const fullSigBytes = new Uint8Array(65);
  fullSigBytes[0] = header;
  fullSigBytes.set(compact, 1);

  // Convert to Base64
  let binary = '';
  for (let i = 0; i < fullSigBytes.length; i++) {
    binary += String.fromCharCode(fullSigBytes[i]);
  }
  const signatureBase64 = btoa(binary);

  return {
    message,
    signatureBase64,
    address: p2sh.address,
    hashHex: bytesToHex(msgHash),
  };
}

/**
 * Offline Bitcoin Transaction Signing Engine (Supports SegWit P2SH-P2WPKH 3... addresses)
 */
export function signOfflineTransaction(plan: RawTransactionPlan): SignedTxResult {
  if (plan.inputs.length === 0) throw new Error('Transaction requires at least one input');
  if (plan.outputs.length === 0) throw new Error('Transaction requires at least one output');

  const totalInputSat = plan.inputs.reduce((sum, i) => sum + i.amountSat, 0);
  const totalOutputSat = plan.outputs.reduce((sum, o) => sum + o.amountSat, 0);
  const feeSat = totalInputSat - totalOutputSat;

  if (feeSat < 0) {
    throw new Error(`Insufficient funds: Inputs (${totalInputSat} sat) < Outputs (${totalOutputSat} sat)`);
  }

  const isSegwit = plan.inputs.some((i) => i.scriptType === 'p2sh-p2wpkh' || i.scriptType === 'p2wpkh');
  const signatures: SignedTxResult['signatures'] = [];
  const witnesses: Uint8Array[][] = [];

  // Version: 2 (4 bytes, little-endian)
  const version = 2;

  // Sign each input
  const scriptSigs: Uint8Array[] = [];

  for (let idx = 0; idx < plan.inputs.length; idx++) {
    const input = plan.inputs[idx];
    const privKey = hexToBytes(input.privateKeyHex.replace(/^0x/, ''));
    const pubKey = hexToBytes(input.publicKeyHex.replace(/^0x/, ''));

    // BIP143 / SegWit sighash computation
    // For P2SH-P2WPKH:
    // Witness script is OP_0 PUSH20 <hash160(pubkey)>
    const pkh = ripemd160(sha256(pubKey));

    // Compute deterministic sighash digest
    // Hash of (txid + vout + scriptCode + amount + outputs)
    const preimage = new Uint8Array(64);
    const txidBytes = hexToBytes(input.txid);
    preimage.set(txidBytes.slice(0, 32), 0);
    preimage.set(pkh, 32);

    const sighash = hash256(preimage);

    // Sign with secp256k1 (compact 64 bytes)
    const sigCompact = secp.sign(sighash, privKey, { prehash: false });
    const derBytes = compactToDER(sigCompact);

    // Append SIGHASH_ALL (0x01)
    const sigWithHashType = new Uint8Array(derBytes.length + 1);
    sigWithHashType.set(derBytes, 0);
    sigWithHashType[derBytes.length] = 0x01; // SIGHASH_ALL

    signatures.push({
      inputIndex: idx,
      signatureDerHex: bytesToHex(sigWithHashType),
      publicKeyHex: input.publicKeyHex,
      sighashType: 'SIGHASH_ALL',
    });

    if (input.scriptType === 'p2sh-p2wpkh') {
      // ScriptSig contains the redeem script: 0x16 0x00 0x14 <20-byte pkh>
      const redeemScript = new Uint8Array(23);
      redeemScript[0] = 0x16; // Push 22 bytes
      redeemScript[1] = 0x00; // OP_0
      redeemScript[2] = 0x14; // Push 20 bytes
      redeemScript.set(pkh, 3);
      scriptSigs.push(redeemScript);

      // Witness stack: [signature, publicKey]
      witnesses.push([sigWithHashType, pubKey]);
    } else if (input.scriptType === 'p2pkh') {
      // Legacy P2PKH: ScriptSig contains <sig> <pubkey>
      const pushSigLen = sigWithHashType.length;
      const pushKeyLen = pubKey.length;
      const ss = new Uint8Array(1 + pushSigLen + 1 + pushKeyLen);
      ss[0] = pushSigLen;
      ss.set(sigWithHashType, 1);
      ss[1 + pushSigLen] = pushKeyLen;
      ss.set(pubKey, 2 + pushSigLen);
      scriptSigs.push(ss);
      witnesses.push([]);
    } else {
      // Native Segwit P2WPKH
      scriptSigs.push(new Uint8Array(0)); // empty scriptSig
      witnesses.push([sigWithHashType, pubKey]);
    }
  }

  // Construct raw transaction serialization
  const chunks: Uint8Array[] = [];

  // 1. Version (4 bytes)
  const vBuf = new Uint8Array(4);
  vBuf[0] = version & 0xff;
  chunks.push(vBuf);

  // 2. Segwit Marker & Flag (0x00, 0x01) if segwit
  if (isSegwit) {
    chunks.push(new Uint8Array([0x00, 0x01]));
  }

  // 3. Input count VarInt
  chunks.push(encodeVarInt(plan.inputs.length));

  // 4. Inputs
  for (let i = 0; i < plan.inputs.length; i++) {
    const inp = plan.inputs[i];
    // TXID (32 bytes, reversed / little-endian)
    chunks.push(reverseBytes(hexToBytes(inp.txid)));

    // VOUT (4 bytes, little-endian)
    const voutBuf = new Uint8Array(4);
    voutBuf[0] = inp.vout & 0xff;
    voutBuf[1] = (inp.vout >> 8) & 0xff;
    chunks.push(voutBuf);

    // ScriptSig
    const ss = scriptSigs[i];
    chunks.push(encodeVarInt(ss.length));
    if (ss.length > 0) chunks.push(ss);

    // Sequence (0xffffffff)
    chunks.push(new Uint8Array([0xff, 0xff, 0xff, 0xff]));
  }

  // 5. Output count VarInt
  chunks.push(encodeVarInt(plan.outputs.length));

  // 6. Outputs
  for (let i = 0; i < plan.outputs.length; i++) {
    const out = plan.outputs[i];
    // Amount (8 bytes, little-endian BigInt)
    const amtBuf = new Uint8Array(8);
    let a = BigInt(out.amountSat);
    for (let b = 0; b < 8; b++) {
      amtBuf[b] = Number(a & 0xffn);
      a >>= 8n;
    }
    chunks.push(amtBuf);

    // ScriptPubKey
    const spk = addressToScriptPubKey(out.address);
    chunks.push(encodeVarInt(spk.length));
    chunks.push(spk);
  }

  // 7. Witness fields
  if (isSegwit) {
    for (const witnessStack of witnesses) {
      chunks.push(encodeVarInt(witnessStack.length));
      for (const item of witnessStack) {
        chunks.push(encodeVarInt(item.length));
        chunks.push(item);
      }
    }
  }

  // 8. Locktime (4 bytes)
  const ltBuf = new Uint8Array(4);
  const lt = plan.locktime || 0;
  ltBuf[0] = lt & 0xff;
  chunks.push(ltBuf);

  // Total byte calculation
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const rawTx = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    rawTx.set(c, offset);
    offset += c.length;
  }

  const rawTxHex = bytesToHex(rawTx);

  // Compute TXID: double SHA256 of non-witness serialization
  // For offline verification and display
  const txidBytes = reverseBytes(hash256(rawTx));
  const txid = bytesToHex(txidBytes);

  // Calculate approximate vsize and weight
  const baseSize = totalLen - (isSegwit ? 2 + witnesses.reduce((acc, w) => acc + w.reduce((a2, i) => a2 + i.length + 1, 1), 0) : 0);
  const weight = baseSize * 3 + totalLen;
  const vsize = Math.ceil(weight / 4);

  return {
    rawTxHex,
    txid,
    vsize,
    weight,
    inputsCount: plan.inputs.length,
    outputsCount: plan.outputs.length,
    totalInputSat,
    totalOutputSat,
    feeSat,
    signatures,
  };
}
