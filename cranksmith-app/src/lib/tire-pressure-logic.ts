// FILE: src/lib/tire-pressure-logic.ts (Complete File)

// --- Constants based on cycling physics principles ---

// Weight distribution assumption (can be adjusted)
const WEIGHT_DISTRIBUTION = {
  front: 0.45, // 45% of total weight on the front wheel
  rear: 0.55,  // 55% on the rear
};

// Target tire deflection (or "drop") as a percentage. 15% is a common starting point.
const TARGET_TIRE_DROP = 0.15;

// Casing efficiency factor. Supple casings deform more easily and require less pressure.
// These are multipliers. 1.0 is the baseline.
const CASING_FACTOR = {
  standard: 1.0,    // e.g., 23-60 TPI, standard vulcanized
  supple: 0.95,     // e.g., 60-120 TPI, more advanced construction
  'ultra-supple': 0.90, // e.g., 200+ TPI, cotton/silk, open tubular
};

// Surface type factor. Rougher surfaces require lower pressure to minimize "impedance" losses.
const SURFACE_FACTOR = {
  pavement: 1.0,
  poor_pavement: 0.95,
  mixed: 0.92,
  gravel_hardpack: 0.85,
  gravel_loose: 0.78,
};

// Tire type factor. Tubeless can run lower pressures safely.
const TIRE_TYPE_FACTOR = {
  tubetype: 1.0,
  tubeless: 0.90,
};

// --- Interfaces ---

export interface AdvancedCalculationInputs {
  riderWeightLbs: number;
  bikeWeightLbs: number;
  tireWidthMm: number;
  rimWidthMm: number;
  wheelDiameter: '700c' | '650b' | '29er';
  tireCasing: 'standard' | 'supple' | 'ultra-supple';
  surfaceType: keyof typeof SURFACE_FACTOR;
  tireType: 'tubetype' | 'tubeless';
  isHookless: boolean;
}

export interface PressureResult {
  frontPsi: number;
  rearPsi: number;
  // Kept for potential future use, but won't be displayed per request.
  frontBar: number; 
  rearBar: number;
  notes: string[];
  warnings: string[];
}

// --- Helper Functions ---

const mmToInches = (mm: number) => mm / 25.4;
const psiToBar = (psi: number) => psi / 14.5038;

// --- The Core Calculation Function ---

export function calculateAdvancedPressure(inputs: AdvancedCalculationInputs): PressureResult {
  const {
    riderWeightLbs,
    bikeWeightLbs,
    tireWidthMm,
    rimWidthMm,
    wheelDiameter,
    tireCasing,
    surfaceType,
    tireType,
    isHookless,
  } = inputs;

  const totalSystemWeightLbs = riderWeightLbs + bikeWeightLbs;

  // --- Initial setup for notes and warnings ---
  const notes: string[] = [];
  const warnings: string[] = [];
  
  // Calculate load on each wheel
  const frontLoadLbs = totalSystemWeightLbs * WEIGHT_DISTRIBUTION.front;
  const rearLoadLbs = totalSystemWeightLbs * WEIGHT_DISTRIBUTION.rear;

  // Estimate the "effective" tire width. A wider rim makes the same tire wider.
  // This is a simplification; a more complex model would use tire/rim geometry.
  const effectiveTireWidthMm = tireWidthMm + (rimWidthMm - 19) * 0.4;
  const tireWidthInches = mmToInches(effectiveTireWidthMm);
  notes.push(`With a ${rimWidthMm}mm rim, your ${tireWidthMm}mm tire has an estimated effective width of ${Math.round(effectiveTireWidthMm)}mm.`);


  // This is the core of the physics-based model. It's a well-regarded formula
  // derived from tire stiffness and load calculations.
  // C is a constant (1.56) derived from testing for the 15% drop.
  // Pressure (PSI) = (C * Load_lbs) / TireWidth_in
  const calculateBasePsi = (loadLbs: number) => (1.56 * loadLbs) / tireWidthInches;

  let baseFrontPsi = calculateBasePsi(frontLoadLbs);
  let baseRearPsi = calculateBasePsi(rearLoadLbs);

  // Apply adjustment factors
  const casingAdjustment = CASING_FACTOR[tireCasing];
  const surfaceAdjustment = SURFACE_FACTOR[surfaceType];
  const tireTypeAdjustment = TIRE_TYPE_FACTOR[tireType];

  const totalAdjustment = casingAdjustment * surfaceAdjustment * tireTypeAdjustment;

  let finalFrontPsi = baseFrontPsi * totalAdjustment;
  let finalRearPsi = baseRearPsi * totalAdjustment;

  // --- Safety Checks and Warnings ---

  // Hookless Rim safety limit (generally 72.5 PSI / 5 Bar)
  const HOOKLESS_MAX_PSI = 72;
  if (isHookless) {
    notes.push(`Hookless rim detected. Pressure is capped at ${HOOKLESS_MAX_PSI} PSI for safety.`);
    if (finalFrontPsi > HOOKLESS_MAX_PSI) {
      warnings.push(`Front pressure was reduced to ${HOOKLESS_MAX_PSI} PSI due to hookless rim limits.`);
      finalFrontPsi = HOOKLESS_MAX_PSI;
    }
    if (finalRearPsi > HOOKLESS_MAX_PSI) {
      warnings.push(`Rear pressure was reduced to ${HOOKLESS_MAX_PSI} PSI due to hookless rim limits.`);
      finalRearPsi = HOOKLESS_MAX_PSI;
    }
  }

  // Absolute minimum pressure to prevent rim strikes, now context-aware based on wheel size and tire width
  let minPsi: number;
  if (wheelDiameter === '700c' && tireWidthMm < 35) {
      minPsi = 30; // Road tires
  } else if (wheelDiameter === '29er' || tireWidthMm >= 50) {
      minPsi = 20; // MTB tires
  } else {
      minPsi = 24; // Gravel / All-road tires
  }
  
  if (finalFrontPsi < minPsi) {
      warnings.push(`Front pressure increased to a minimum of ${minPsi} PSI to reduce rim strike risk for your setup.`);
      finalFrontPsi = minPsi;
  }
  if (finalRearPsi < minPsi) {
      warnings.push(`Rear pressure increased to a minimum of ${minPsi} PSI to reduce rim strike risk for your setup.`);
      finalRearPsi = minPsi;
  }

  // Add contextual notes
  if (surfaceAdjustment < 1.0) notes.push('Lower pressure is recommended for rougher surfaces to improve comfort and reduce vibration-based energy loss (impedance).');
  if (casingAdjustment < 1.0) notes.push('Supple casings are more flexible and can be run at a slightly lower pressure for optimal performance.');
  if (tireType === 'tubeless') notes.push('Tubeless tires can safely be run at lower pressures, improving grip and comfort without the risk of pinch flats.');
  
  return {
    frontPsi: Math.round(finalFrontPsi),
    rearPsi: Math.round(finalRearPsi),
    frontBar: parseFloat(psiToBar(finalFrontPsi).toFixed(2)),
    rearBar: parseFloat(psiToBar(finalRearPsi).toFixed(2)),
    notes,
    warnings,
  };
}