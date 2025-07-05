// src/lib/suspension-logic.ts
// Improved suspension calculation logic based on real physics

export interface SuspensionSpecs {
  brand: string
  model: string
  travel_mm: number
  stanchion_diameter_mm: number
  air_chamber_volume_cc?: number // If known
  baseline_pressure_chart?: PressureChart[]
  max_pressure_psi: number
  recommended_sag_percent: number
  spring_curve: 'linear' | 'progressive' | 'digressive'
}

export interface PressureChart {
  rider_weight_lbs: number
  recommended_psi: number
  sag_percent: number
}

export interface SuspensionCalculationInputs {
  riderWeightLbs: number
  gearWeightLbs: number
  forkSpecs?: SuspensionSpecs
  shockSpecs?: SuspensionSpecs
  ridingStyle: 'xc' | 'trail' | 'enduro' | 'dh' | 'casual'
  targetSagPercent?: number // Allow custom sag targets
}

export interface SuspensionResult {
  airPressure: number
  targetSag: number
  reboundClicks: number
  compressionClicks?: number
  volumeSpacers?: number
  notes: string[]
  accuracy: 'high' | 'medium' | 'low'
}

// Real-world suspension physics constants
const SUSPENSION_CONSTANTS = {
  // Base pressure per pound of rider weight (varies by stanchion size)
  BASE_PRESSURE_RATIOS: {
    30: 1.8,  // 30mm stanchions (rare, very old)
    32: 1.6,  // 32mm stanchions (XC forks)
    34: 1.4,  // 34mm stanchions (Trail forks)  
    35: 1.3,  // 35mm stanchions (Fox specific)
    36: 1.2,  // 36mm stanchions (Enduro/DH)
    38: 1.1,  // 38mm stanchions (DH specific)
    40: 1.0   // 40mm stanchions (DH/FR)
  },
  
  // Travel multipliers (more travel = lower pressure needed)
  TRAVEL_FACTORS: {
    80: 1.15,   // Short travel XC
    100: 1.10,  // XC
    120: 1.05,  // Short trail
    130: 1.02,  // Trail
    140: 1.00,  // Standard trail (baseline)
    150: 0.98,  // Long trail
    160: 0.95,  // Enduro
    170: 0.92,  // Long travel enduro
    180: 0.90,  // DH/FR
    200: 0.85   // Long DH
  },

  // Riding style adjustments
  RIDING_STYLE_FACTORS: {
    xc: 1.10,      // Higher pressure for efficiency
    trail: 1.00,   // Baseline
    enduro: 0.95,  // Slightly lower for bigger hits
    dh: 0.90,      // Much lower for big hits
    casual: 1.05   // Slightly higher for comfort/safety
  },

  // Target sag percentages by discipline
  TARGET_SAG: {
    xc: 20,        // 20% sag for efficiency
    trail: 25,     // 25% sag for balance
    enduro: 30,    // 30% sag for bigger hits
    dh: 30,        // 30% sag for big hits
    casual: 22     // 22% sag for comfort
  }
}

// Known fork specifications (expand this database)
export const FORK_DATABASE: Record<string, SuspensionSpecs> = {
  'Fox 34 Float': {
    brand: 'Fox',
    model: '34 Float',
    travel_mm: 140, // Default, varies by model
    stanchion_diameter_mm: 34,
    air_chamber_volume_cc: 350, // Approximate
    max_pressure_psi: 300,
    recommended_sag_percent: 25,
    spring_curve: 'progressive'
  },
  'Fox 36 Float': {
    brand: 'Fox',
    model: '36 Float',
    travel_mm: 160,
    stanchion_diameter_mm: 36,
    air_chamber_volume_cc: 420,
    max_pressure_psi: 300,
    recommended_sag_percent: 25,
    spring_curve: 'progressive'
  },
  'RockShox Pike': {
    brand: 'RockShox',
    model: 'Pike',
    travel_mm: 140,
    stanchion_diameter_mm: 35,
    air_chamber_volume_cc: 380,
    max_pressure_psi: 280,
    recommended_sag_percent: 25,
    spring_curve: 'linear'
  },
  'RockShox Lyrik': {
    brand: 'RockShox',
    model: 'Lyrik',
    travel_mm: 160,
    stanchion_diameter_mm: 35,
    air_chamber_volume_cc: 400,
    max_pressure_psi: 280,
    recommended_sag_percent: 25,
    spring_curve: 'linear'
  }
}

export function calculateSuspensionSetup(inputs: SuspensionCalculationInputs): SuspensionResult {
  const { riderWeightLbs, gearWeightLbs, forkSpecs, ridingStyle, targetSagPercent } = inputs
  const totalWeight = riderWeightLbs + gearWeightLbs

  if (!forkSpecs) {
    return {
      airPressure: 0,
      targetSag: 0,
      reboundClicks: 0,
      notes: ['No fork specifications provided'],
      accuracy: 'low'
    }
  }

  const notes: string[] = []
  
  // Get the base pressure ratio for this stanchion size
  const stanchionSize = forkSpecs.stanchion_diameter_mm
  const basePressureRatio = SUSPENSION_CONSTANTS.BASE_PRESSURE_RATIOS[stanchionSize as keyof typeof SUSPENSION_CONSTANTS.BASE_PRESSURE_RATIOS] || 1.5
  
  // Get travel factor
  const travelFactor = SUSPENSION_CONSTANTS.TRAVEL_FACTORS[forkSpecs.travel_mm as keyof typeof SUSPENSION_CONSTANTS.TRAVEL_FACTORS] || 1.0
  
  // Get riding style factor
  const styleFactor = SUSPENSION_CONSTANTS.RIDING_STYLE_FACTORS[ridingStyle] || 1.0
  
  // Calculate base pressure
  let airPressure = totalWeight * basePressureRatio * travelFactor * styleFactor
  
  // Apply sag adjustments if custom target provided
  const targetSag = targetSagPercent || SUSPENSION_CONSTANTS.TARGET_SAG[ridingStyle] || 25
  const sagAdjustment = 25 / targetSag // Normalize to 25% baseline
  airPressure *= sagAdjustment

  // Ensure we don't exceed max pressure
  if (airPressure > forkSpecs.max_pressure_psi) {
    notes.push(`Pressure capped at ${forkSpecs.max_pressure_psi} PSI (manufacturer limit)`)
    airPressure = forkSpecs.max_pressure_psi
  }

  // Ensure minimum pressure for safety
  const minPressure = Math.max(40, totalWeight * 0.8)
  if (airPressure < minPressure) {
    notes.push(`Pressure increased to ${minPressure} PSI minimum for safety`)
    airPressure = minPressure
  }

  // Calculate rebound clicks (rough estimate)
  const reboundClicks = Math.round(8 + (totalWeight - 160) / 20)
  
  // Add helpful notes
  notes.push(`Based on ${stanchionSize}mm stanchions and ${forkSpecs.travel_mm}mm travel`)
  notes.push(`Target sag: ${targetSag}% (${Math.round(forkSpecs.travel_mm * targetSag / 100)}mm)`)
  
  if (forkSpecs.spring_curve === 'progressive') {
    notes.push('Progressive spring curve - may feel more linear as you add pressure')
  }

  // Determine accuracy based on available data
  let accuracy: 'high' | 'medium' | 'low' = 'medium'
  if (forkSpecs.air_chamber_volume_cc && forkSpecs.baseline_pressure_chart) {
    accuracy = 'high'
  } else if (forkSpecs.stanchion_diameter_mm && forkSpecs.travel_mm) {
    accuracy = 'medium'
  } else {
    accuracy = 'low'
  }

  return {
    airPressure: Math.round(airPressure),
    targetSag,
    reboundClicks: Math.max(1, Math.min(20, reboundClicks)),
    notes,
    accuracy
  }
}

// Helper function to get fork specs from your database
export function getForkSpecs(brand: string, model: string, travel?: number): SuspensionSpecs | null {
  const key = `${brand} ${model}`
  const specs = FORK_DATABASE[key]
  
  if (specs && travel && travel !== specs.travel_mm) {
    // Adjust for different travel if specified
    return {
      ...specs,
      travel_mm: travel
    }
  }
  
  return specs || null
}