import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { hmac } from '@noble/hashes/hmac.js';
import * as secp from '@noble/secp256k1';
import { base58CheckEncode } from './bitcoin.ts';

// Configure synchronous hashes for secp
secp.hashes.sha256 = (msg) => sha256(msg);
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);

export interface MultisigConfig {
  m: number; // Required signatures (e.g. 2)
  n: number; // Total cosigners (e.g. 3)
  publicKeys: string[]; // Hex-encoded 33-byte compressed public keys
}

export interface MultisigResult {
  p2shAddress: string; // Starts with 3
  redeemScriptHex: string;
  redeemScriptAsm: string;
  scriptHashHex: string;
  sortedPublicKeys: string[];
}

export interface SignatureVerificationResult {
  isValid: boolean;
  validCount: number;
  thresholdRequired: number;
  totalKeys: number;
  signaturesChecked: {
    signatureHex: string;
    matchedPublicKey: string | null;
    keyIndex: number;
    isValid: boolean;
  }[];
  errorMessage?: string;
}

/**
 * Compare two hex strings lexicographically (BIP67 standard)
 */
export function compareHexBIP67(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Construct BIP16 / BIP67 P2SH Multisig Redeem Script & Address
 * Output address starts with '3'
 */
export function createMultisigP2SH(m: number, publicKeys: string[], sortKeys = true): MultisigResult {
  if (publicKeys.length < 1 || publicKeys.length > 16) {
    throw new Error('Total public keys must be between 1 and 16');
  }
  if (m < 1 || m > publicKeys.length) {
    throw new Error(`Threshold M must be between 1 and ${publicKeys.length}`);
  }

  // Validate public keys
  const cleanedKeys = publicKeys.map((k) => k.trim().toLowerCase());
  for (const k of cleanedKeys) {
    if (!/^[0-9a-f]{66}$/.test(k)) {
      throw new Error(`Invalid compressed public key format (must be 33 bytes / 66 hex characters): ${k}`);
    }
  }

  // Sort keys according to BIP67
  const sorted = sortKeys ? [...cleanedKeys].sort(compareHexBIP67) : [...cleanedKeys];

  // Construct Redeem Script:
  // OP_M (0x50 + M) + for each key: [0x21, 33-byte pubkey] + OP_N (0x50 + N) + OP_CHECKMULTISIG (0xae)
  const opM = 0x50 + m;
  const opN = 0x50 + sorted.length;
  const opCheckMultisig = 0xae;

  const scriptBytes: number[] = [opM];
  let asm = `OP_${m}`;

  for (const keyHex of sorted) {
    scriptBytes.push(0x21); // Push 33 bytes
    const keyBytes = hexToBytes(keyHex);
    for (let i = 0; i < keyBytes.length; i++) {
      scriptBytes.push(keyBytes[i]);
    }
    asm += ` ${keyHex}`;
  }

  scriptBytes.push(opN);
  scriptBytes.push(opCheckMultisig);
  asm += ` OP_${sorted.length} OP_CHECKMULTISIG`;

  const redeemScript = new Uint8Array(scriptBytes);
  const redeemScriptHex = bytesToHex(redeemScript);

  // Hash160(redeemScript) = RIPEMD160(SHA256(redeemScript))
  const scriptHash = ripemd160(sha256(redeemScript));
  const scriptHashHex = bytesToHex(scriptHash);

  // P2SH Address = Base58Check(0x05 + scriptHash) -> Starts with '3'
  const payload = new Uint8Array(21);
  payload[0] = 0x05;
  payload.set(scriptHash, 1);
  const p2shAddress = base58CheckEncode(payload);

  return {
    p2shAddress,
    redeemScriptHex,
    redeemScriptAsm: asm,
    scriptHashHex,
    sortedPublicKeys: sorted,
  };
}

/**
 * Verify signatures for a multisig message / transaction digest
 */
export function verifyMultisigSignatures(
  messageDigestHex: string, // 32 bytes hex hash (or message SHA256)
  publicKeys: string[],
  signatures: string[],
  requiredM: number
): SignatureVerificationResult {
  const digestBytes = hexToBytes(messageDigestHex.trim().replace(/^0x/, ''));
  if (digestBytes.length !== 32) {
    return {
      isValid: false,
      validCount: 0,
      thresholdRequired: requiredM,
      totalKeys: publicKeys.length,
      signaturesChecked: [],
      errorMessage: 'Message digest must be exactly 32 bytes (64 hex characters)',
    };
  }

  const results: SignatureVerificationResult['signaturesChecked'] = [];
  const matchedKeyIndices = new Set<number>();

  for (const sigHex of signatures) {
    const cleanSig = sigHex.trim().replace(/^0x/, '');
    if (!cleanSig) continue;

    let matched = false;
    let sigBytes: Uint8Array;

    try {
      sigBytes = hexToBytes(cleanSig);
    } catch {
      results.push({
        signatureHex: cleanSig,
        matchedPublicKey: null,
        keyIndex: -1,
        isValid: false,
      });
      continue;
    }

    // Try matching against any of the public keys
    for (let k = 0; k < publicKeys.length; k++) {
      if (matchedKeyIndices.has(k)) continue; // Can't reuse same public key signature

      const pubKeyBytes = hexToBytes(publicKeys[k]);
      try {
        let isSecpValid = false;
        // Standard compact 64-byte signature
        if (sigBytes.length === 64) {
          isSecpValid = secp.verify(sigBytes, digestBytes, pubKeyBytes);
        } else {
          // Attempt DER or raw signature
          // Strip sighash byte if present (e.g. SIGHASH_ALL 0x01 at end)
          const derSig = sigBytes.length > 64 && (sigBytes[sigBytes.length - 1] === 1 || sigBytes[sigBytes.length - 1] === 0x81 || sigBytes[sigBytes.length - 1] === 0x83)
            ? sigBytes.slice(0, -1)
            : sigBytes;
          isSecpValid = secp.verify(derSig, digestBytes, pubKeyBytes);
        }

        if (isSecpValid) {
          matched = true;
          matchedKeyIndices.add(k);
          results.push({
            signatureHex: cleanSig,
            matchedPublicKey: publicKeys[k],
            keyIndex: k,
            isValid: true,
          });
          break;
        }
      } catch {
        // Continue testing next key
      }
    }

    if (!matched) {
      results.push({
        signatureHex: cleanSig,
        matchedPublicKey: null,
        keyIndex: -1,
        isValid: false,
      });
    }
  }

  const validCount = results.filter((r) => r.isValid).length;
  const passed = validCount >= requiredM;

  return {
    isValid: passed,
    validCount,
    thresholdRequired: requiredM,
    totalKeys: publicKeys.length,
    signaturesChecked: results,
  };
}
