/**
 * UPS Standard Packaging Options
 * 
 * Reference: https://developer.ups.com/us/en/support/shipping-support/shipping-dimensions-weight
 * 
 * UPS Rules:
 * - Max weight: 150 lbs
 * - Max length: 108 inches (longest side)
 * - Length + Girth: Up to 165 inches (L + 2W + 2H)
 * - Additional handling triggers: longest side > 48", second-longest > 30", or weight > 50 lbs
 * - DIM weight divisor: 139 (daily rates) or 166 (retail rates)
 */

export interface UPSBox {
  name: string;
  code: string; // UPS package code for API
  length: number; // inches
  width: number; // inches
  height: number; // inches
  maxWeight: number; // lbs
}

/**
 * UPS Standard Packaging Options
 * Sorted by volume (smallest to largest) for optimal box selection
 */
export const UPS_STANDARD_BOXES: readonly UPSBox[] = [
  {
    name: 'UPS Express Envelope',
    code: '01',
    length: 12.5,
    width: 9.5,
    height: 0.25,
    maxWeight: 0.5,
  },
  {
    name: 'UPS Express Pak',
    code: '04',
    length: 16,
    width: 12.75,
    height: 2,
    maxWeight: 3,
  },
  {
    name: 'UPS Express Box - Small',
    code: '2a',
    length: 13,
    width: 11,
    height: 2,
    maxWeight: 10,
  },
  {
    name: 'UPS Express Box - Medium',
    code: '2b',
    length: 16,
    width: 11,
    height: 3,
    maxWeight: 20,
  },
  {
    name: 'UPS Express Box - Large',
    code: '2c',
    length: 18,
    width: 13,
    height: 3,
    maxWeight: 30,
  },
  {
    name: 'Custom Box',
    code: '02', // Customer-supplied package
    length: 108, // Max allowed
    width: 108,
    height: 108,
    maxWeight: 150,
  },
] as const;

export type UPSBoxType = typeof UPS_STANDARD_BOXES[number]['name'];

export interface BoxSelectionResult {
  box: UPSBox;
  isCustom: boolean;
  requiresAdditionalHandling: boolean;
  billableWeight: number;
  actualWeight: number;
  dimWeight: number;
}

/**
 * Select the smallest UPS standard box that fits the prize dimensions
 * Tries all orientations to find the best fit
 * 
 * @param lengthIn - Prize length in inches
 * @param widthIn - Prize width in inches  
 * @param heightIn - Prize height in inches
 * @param weightLbs - Prize weight in pounds
 * @returns Box selection result with billable weight calculation
 */
export function selectUPSBox(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  weightLbs: number
): BoxSelectionResult {
  // Sort dimensions largest to smallest for consistent comparison
  const dims = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
  const [l, w, h] = dims;
  
  // Calculate dimensional weight (DIM weight)
  // UPS uses divisor of 139 for daily rates
  const dimWeight = (l * w * h) / 139;
  const billableWeight = Math.max(weightLbs, dimWeight);
  
  // Check for additional handling requirements
  const requiresAdditionalHandling = 
    l > 48 || // Longest side > 48"
    w > 30 || // Second longest side > 30"
    weightLbs > 50; // Weight > 50 lbs

  // Try to find the smallest standard box that fits
  for (const box of UPS_STANDARD_BOXES) {
    if (box.name === 'Custom Box') continue;
    
    // Sort box dimensions for any-orientation comparison
    const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a);
    const [bl, bw, bh] = boxDims;
    
    // Check if prize fits in box (any orientation) and within weight limit
    if (l <= bl && w <= bw && h <= bh && weightLbs <= box.maxWeight) {
      return {
        box,
        isCustom: false,
        requiresAdditionalHandling,
        billableWeight: Math.ceil(billableWeight * 10) / 10, // Round up to 0.1 lb
        actualWeight: weightLbs,
        dimWeight: Math.ceil(dimWeight * 10) / 10,
      };
    }
  }
  
  // No standard box fits - use custom box
  const customBox = UPS_STANDARD_BOXES[UPS_STANDARD_BOXES.length - 1];
  return {
    box: customBox,
    isCustom: true,
    requiresAdditionalHandling,
    billableWeight: Math.ceil(billableWeight * 10) / 10,
    actualWeight: weightLbs,
    dimWeight: Math.ceil(dimWeight * 10) / 10,
  };
}

/**
 * Calculate billable weight (max of actual vs dimensional)
 * UPS DIM divisor: 139 for daily rates, 166 for retail rates
 * 
 * @param lengthIn - Package length in inches
 * @param widthIn - Package width in inches
 * @param heightIn - Package height in inches
 * @param actualWeightLbs - Actual weight in pounds
 * @param divisor - DIM weight divisor (default: 139 for daily rates)
 * @returns Billable weight in pounds (rounded up to 0.1 lb)
 */
export function calculateBillableWeight(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  actualWeightLbs: number,
  divisor: number = 139
): number {
  const dimWeight = (lengthIn * widthIn * heightIn) / divisor;
  return Math.ceil(Math.max(actualWeightLbs, dimWeight) * 10) / 10;
}

/**
 * Convert grams to pounds
 */
export function gramsToLbs(grams: number): number {
  return grams / 453.59237;
}

/**
 * Validate package dimensions against UPS limits
 * @returns Array of validation errors, empty if valid
 */
export function validateUPSDimensions(
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  weightLbs: number
): string[] {
  const errors: string[] = [];
  const dims = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
  const [l, w, h] = dims;
  
  // Max length check
  if (l > 108) {
    errors.push(`Longest side (${l}") exceeds UPS max of 108"`);
  }
  
  // Length + Girth check
  const girth = 2 * w + 2 * h;
  if (l + girth > 165) {
    errors.push(`Length + Girth (${l + girth}") exceeds UPS max of 165"`);
  }
  
  // Weight check
  if (weightLbs > 150) {
    errors.push(`Weight (${weightLbs} lbs) exceeds UPS max of 150 lbs`);
  }
  
  return errors;
}
