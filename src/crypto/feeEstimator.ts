export type InputScriptType = 'p2sh-p2wpkh' | 'p2pkh' | 'p2wpkh' | 'p2tr' | 'multisig_2_3';
export type OutputScriptType = 'p2sh' | 'p2pkh' | 'p2wpkh' | 'p2tr';

export interface FeePreset {
  id: 'priority' | 'normal' | 'economy' | 'minimum';
  label: string;
  sublabel: string;
  satPerVbyte: number;
  estBlocks: number;
  estMinutes: string;
}

export const DEFAULT_FEE_PRESETS: FeePreset[] = [
  {
    id: 'priority',
    label: '极速优先',
    sublabel: '预计下个区块 (约 10 分钟)',
    satPerVbyte: 32,
    estBlocks: 1,
    estMinutes: '~10 分钟',
  },
  {
    id: 'normal',
    label: '标准常规',
    sublabel: '预计 3 个区块内 (约 30 分钟)',
    satPerVbyte: 18,
    estBlocks: 3,
    estMinutes: '~30 分钟',
  },
  {
    id: 'economy',
    label: '经济慢速',
    sublabel: '预计 6 个区块内 (约 1 小时)',
    satPerVbyte: 9,
    estBlocks: 6,
    estMinutes: '~60 分钟',
  },
  {
    id: 'minimum',
    label: '静默闲时',
    sublabel: '离线广播/低优先级 (半天至次日)',
    satPerVbyte: 3,
    estBlocks: 18,
    estMinutes: '>2 小时',
  },
];

// Input virtual sizes in vBytes
const INPUT_VBYTES: Record<InputScriptType, number> = {
  'p2pkh': 148,           // Legacy 1...
  'p2sh-p2wpkh': 91,      // Nested SegWit 3...
  'p2wpkh': 68,           // Native SegWit bc1q...
  'p2tr': 57.5,           // Taproot bc1p...
  'multisig_2_3': 297,    // Multisig 2-of-3 P2SH 3...
};

// Output virtual sizes in vBytes
const OUTPUT_VBYTES: Record<OutputScriptType, number> = {
  'p2pkh': 34,
  'p2sh': 32,
  'p2wpkh': 31,
  'p2tr': 43,
};

export interface FeeCalculationResult {
  vSize: number;
  weight: number;
  feeSat: number;
  feeBtc: string;
  satPerVbyte: number;
  legacyEquivalentFeeSat: number;
  savingsSat: number;
  savingsPercent: number;
  estConfirmation: string;
}

/**
 * Accurately calculate Bitcoin transaction virtual size and fee
 */
export function calculateTxFee(
  inputCount: number,
  inputType: InputScriptType,
  outputCount: number,
  outputType: OutputScriptType,
  satPerVbyte: number
): FeeCalculationResult {
  // Overhead: 10.5 vBytes (version 4B, locktime 4B, segwit marker 0.5B, varints)
  const overhead = inputType === 'p2pkh' ? 10 : 10.5;
  const inSize = inputCount * INPUT_VBYTES[inputType];
  const outSize = outputCount * OUTPUT_VBYTES[outputType];
  const vSize = Math.ceil(overhead + inSize + outSize);
  const weight = Math.ceil(vSize * 4);

  const feeSat = Math.max(vSize * satPerVbyte, 142); // minimum relay threshold
  const feeBtc = (feeSat / 100_000_000).toFixed(8);

  // Compare with Legacy P2PKH to calculate savings
  const legacyVsize = Math.ceil(10 + inputCount * INPUT_VBYTES['p2pkh'] + outputCount * OUTPUT_VBYTES['p2pkh']);
  const legacyFeeSat = Math.max(legacyVsize * satPerVbyte, 142);
  const savingsSat = Math.max(0, legacyFeeSat - feeSat);
  const savingsPercent = legacyFeeSat > 0 ? Number(((savingsSat / legacyFeeSat) * 100).toFixed(1)) : 0;

  let estConfirmation = '~10-30 分钟';
  if (satPerVbyte >= 28) estConfirmation = '下个区块 (~10 分钟)';
  else if (satPerVbyte >= 15) estConfirmation = '~30 分钟 (2-3 区块)';
  else if (satPerVbyte >= 7) estConfirmation = '~1-2 小时 (6 区块)';
  else estConfirmation = '>3 小时 (待网络闲置)';

  return {
    vSize,
    weight,
    feeSat,
    feeBtc,
    satPerVbyte,
    legacyEquivalentFeeSat: legacyFeeSat,
    savingsSat,
    savingsPercent,
    estConfirmation,
  };
}
