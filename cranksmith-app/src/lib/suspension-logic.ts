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

// NOTE: This database provides approximate and default values.
// - `travel_mm` often represents a common configuration, but many forks are adjustable or sold in different travel lengths.
// - `air_chamber_volume_cc` is an ESTIMATED value, as manufacturers do not publish this internal spec. It's derived from stanchion size, travel, and fork architecture to provide a reasonable baseline for calculations.
// - `max_pressure_psi` and `recommended_sag_percent` are based on manufacturer guidelines but can vary by rider preference and specific model year.

export const FORK_DATABASE: Record<string, SuspensionSpecs> = {
  // --- FOX ---
  'Fox 32 Step-Cast Float': {
    brand: 'Fox',
    model: '32 Step-Cast Float',
    travel_mm: 100, // Common for XC, up to 120mm
    stanchion_diameter_mm: 32,
    air_chamber_volume_cc: 280, // Approximate, smaller volume for XC race
    max_pressure_psi: 250,
    recommended_sag_percent: 15,
    spring_curve: 'linear'
  },
  'Fox 34 Float': {
    brand: 'Fox',
    model: '34 Float',
    travel_mm: 140, // Common for Trail, typically 120-140mm
    stanchion_diameter_mm: 34,
    air_chamber_volume_cc: 350, // Approximate
    max_pressure_psi: 140, // For GRIP2/Float EVOL, older FIT4 can be higher
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Fox 34 Step-Cast Float': {
    brand: 'Fox',
    model: '34 Step-Cast Float',
    travel_mm: 120, // Common for "Downcountry", 100-120mm
    stanchion_diameter_mm: 34,
    air_chamber_volume_cc: 320, // Approximate, slightly smaller than standard 34
    max_pressure_psi: 140,
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Fox 36 Float': {
    brand: 'Fox',
    model: '36 Float',
    travel_mm: 160, // Common for Enduro, typically 150-170mm
    stanchion_diameter_mm: 36,
    air_chamber_volume_cc: 410, // Approximate
    max_pressure_psi: 140, // For GRIP2/Float EVOL
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Fox 38 Float': {
    brand: 'Fox',
    model: '38 Float',
    travel_mm: 170, // Common for Enduro/Freeride, typically 160-180mm
    stanchion_diameter_mm: 38,
    air_chamber_volume_cc: 460, // Approximate, larger volume for big hits
    max_pressure_psi: 140, // For GRIP2/Float EVOL
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Fox 40 Float': {
    brand: 'Fox',
    model: '40 Float',
    travel_mm: 203, // Standard DH travel
    stanchion_diameter_mm: 40,
    air_chamber_volume_cc: 550, // Approximate, large volume DH fork
    max_pressure_psi: 140,
    recommended_sag_percent: 25,
    spring_curve: 'progressive'
  },

  // --- ROCKSHOX ---
  'RockShox SID SL Ultimate': {
    brand: 'RockShox',
    model: 'SID SL Ultimate',
    travel_mm: 100, // Standard for XC race
    stanchion_diameter_mm: 32,
    air_chamber_volume_cc: 290, // Approximate
    max_pressure_psi: 240,
    recommended_sag_percent: 15,
    spring_curve: 'linear'
  },
  'RockShox SID Ultimate (35mm)': {
    brand: 'RockShox',
    model: 'SID Ultimate (35mm)',
    travel_mm: 120, // Standard for "Downcountry"
    stanchion_diameter_mm: 35,
    air_chamber_volume_cc: 360, // Approximate, similar to a Pike but lighter tune
    max_pressure_psi: 260,
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'RockShox Pike Ultimate': {
    brand: 'RockShox',
    model: 'Pike Ultimate',
    travel_mm: 140, // Common for Trail, typically 120-150mm
    stanchion_diameter_mm: 35,
    air_chamber_volume_cc: 380, // Approximate
    max_pressure_psi: 279, // Varies by Charger damper version
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'RockShox Lyrik Ultimate': {
    brand: 'RockShox',
    model: 'Lyrik Ultimate',
    travel_mm: 160, // Common for Enduro, typically 150-180mm
    stanchion_diameter_mm: 35,
    air_chamber_volume_cc: 420, // Approximate
    max_pressure_psi: 279,
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'RockShox ZEB Ultimate': {
    brand: 'RockShox',
    model: 'ZEB Ultimate',
    travel_mm: 170, // Common for Enduro, typically 160-190mm
    stanchion_diameter_mm: 38,
    air_chamber_volume_cc: 480, // Approximate, larger volume than Lyrik
    max_pressure_psi: 270,
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'RockShox BoXXer Ultimate': {
    brand: 'RockShox',
    model: 'BoXXer Ultimate',
    travel_mm: 200, // Standard DH travel
    stanchion_diameter_mm: 38, // Newer models, older were 35mm
    air_chamber_volume_cc: 520, // Approximate
    max_pressure_psi: 250,
    recommended_sag_percent: 25,
    spring_curve: 'progressive'
  },

  // --- MARZOCCHI ---
  'Marzocchi Bomber Z2': {
    brand: 'Marzocchi',
    model: 'Bomber Z2',
    travel_mm: 140, // Common for Trail, range 100-150mm
    stanchion_diameter_mm: 34,
    air_chamber_volume_cc: 360, // Approximate, based on Fox 34 chassis
    max_pressure_psi: 140, // Rail Damper
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Marzocchi Bomber Z1': {
    brand: 'Marzocchi',
    model: 'Bomber Z1',
    travel_mm: 170, // Common for Enduro, range 150-180mm
    stanchion_diameter_mm: 36,
    air_chamber_volume_cc: 415, // Approximate, based on Fox 36 chassis
    max_pressure_psi: 140, // GRIP Damper
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Marzocchi Bomber 58': {
    brand: 'Marzocchi',
    model: 'Bomber 58',
    travel_mm: 203, // Standard DH travel
    stanchion_diameter_mm: 40,
    air_chamber_volume_cc: 550, // Approximate, based on Fox 40 chassis
    max_pressure_psi: 140,
    recommended_sag_percent: 25,
    spring_curve: 'progressive'
  },

  // --- ÖHLINS ---
  'Öhlins RXF36 M.2 Air': {
    brand: 'Öhlins',
    model: 'RXF36 M.2 Air',
    travel_mm: 160, // Common for Trail/Enduro, range 120-170mm
    stanchion_diameter_mm: 36,
    air_chamber_volume_cc: 400, // Approximate, has unique 3-chamber air spring
    max_pressure_psi: 175,
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Öhlins RXF38 M.2 Air': {
    brand: 'Öhlins',
    model: 'RXF38 M.2 Air',
    travel_mm: 170, // Common for Enduro, range 160-180mm
    stanchion_diameter_mm: 38,
    air_chamber_volume_cc: 470, // Approximate, has unique 3-chamber air spring
    max_pressure_psi: 175,
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Öhlins DH38 M.1 Air': {
    brand: 'Öhlins',
    model: 'DH38 M.1 Air',
    travel_mm: 200, // Standard DH travel
    stanchion_diameter_mm: 38,
    air_chamber_volume_cc: 530, // Approximate
    max_pressure_psi: 175,
    recommended_sag_percent: 25,
    spring_curve: 'progressive'
  },
  
  // --- CANE CREEK ---
  'Cane Creek Helm MKII Air': {
    brand: 'Cane Creek',
    model: 'Helm MKII Air',
    travel_mm: 160, // Internally adjustable from 130-160mm
    stanchion_diameter_mm: 35,
    air_chamber_volume_cc: 400, // Approximate, has independent pos/neg chambers
    max_pressure_psi: 150,
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },

  // --- DVO ---
  'DVO Sapphire D1': {
    brand: 'DVO',
    model: 'Sapphire D1',
    travel_mm: 140, // Internally adjustable from 120-150mm
    stanchion_diameter_mm: 34,
    air_chamber_volume_cc: 370, // Approximate
    max_pressure_psi: 180,
    recommended_sag_percent: 20,
    spring_curve: 'progressive' // OTT (Off The Top) adjustment
  },
  'DVO Onyx SC D1': {
    brand: 'DVO',
    model: 'Onyx SC D1',
    travel_mm: 170, // Internally adjustable from 160-180mm
    stanchion_diameter_mm: 36,
    air_chamber_volume_cc: 430, // Approximate
    max_pressure_psi: 180,
    recommended_sag_percent: 20,
    spring_curve: 'progressive' // OTT (Off The Top) adjustment
  },

  // --- MANITOU ---
  'Manitou Mattoc Pro': {
    brand: 'Manitou',
    model: 'Mattoc Pro',
    travel_mm: 140, // Adjustable 110-150mm
    stanchion_diameter_mm: 34,
    air_chamber_volume_cc: 400, // Approximate, low-pressure system implies larger volume
    max_pressure_psi: 120, // Dorado Air is a low-pressure system
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  },
  'Manitou Mezzer Pro': {
    brand: 'Manitou',
    model: 'Mezzer Pro',
    travel_mm: 160, // Adjustable 140-180mm
    stanchion_diameter_mm: 37,
    air_chamber_volume_cc: 500, // Approximate, low-pressure system implies larger volume
    max_pressure_psi: 120, // Dorado Air is a low-pressure system
    recommended_sag_percent: 20,
    spring_curve: 'progressive'
  }
}

// NOTE: This database provides approximate and default values for common shock configurations.
// - `travel_mm` represents the shock's STROKE length (e.g., 65mm), NOT the bike's rear wheel travel.
// - `stanchion_diameter_mm` for shocks represents the DAMPER SHAFT diameter.
// - `air_chamber_volume_cc` is an ESTIMATED value based on the shock's intended use, physical size, and stroke. It's a baseline for calculations and is heavily influenced by volume spacers.
// - Coil shocks are included with `air_chamber_volume_cc` and `max_pressure_psi` set to 0, and `spring_curve` set to 'coil'.

export const SHOCK_DATABASE: Record<string, SuspensionSpecs> = {
  // --- FOX (Air Shocks) ---
  'Fox Float SL': {
    brand: 'Fox',
    model: 'Float SL',
    travel_mm: 45, // Common XC stroke (e.g., 190x45mm)
    stanchion_diameter_mm: 9, // Damper shaft diameter
    air_chamber_volume_cc: 140, // Approximate, small volume XC shock
    max_pressure_psi: 350,
    recommended_sag_percent: 25,
    spring_curve: 'linear'
  },
  'Fox Float DPS': {
    brand: 'Fox',
    model: 'Float DPS',
    travel_mm: 50, // Common Trail stroke (e.g., 210x50mm)
    stanchion_diameter_mm: 9, // Damper shaft diameter
    air_chamber_volume_cc: 160, // Approximate, standard volume can
    max_pressure_psi: 350,
    recommended_sag_percent: 25,
    spring_curve: 'progressive'
  },
  'Fox Float X': {
    brand: 'Fox',
    model: 'Float X',
    travel_mm: 55, // Common Trail/All-Mountain stroke (e.g., 210x55mm)
    stanchion_diameter_mm: 12.7, // 1/2 inch damper shaft
    air_chamber_volume_cc: 220, // Approximate, larger piggyback volume
    max_pressure_psi: 350,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  'Fox Float X2': {
    brand: 'Fox',
    model: 'Float X2',
    travel_mm: 65, // Common Enduro/DH stroke (e.g., 230x65mm)
    stanchion_diameter_mm: 9, // Damper shaft diameter
    air_chamber_volume_cc: 280, // Approximate, high volume
    max_pressure_psi: 300, // Note: Lower max PSI than other Fox shocks
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },

  // --- ROCKSHOX (Air Shocks) ---
  'RockShox SIDLuxe Ultimate': {
    brand: 'RockShox',
    model: 'SIDLuxe Ultimate',
    travel_mm: 45, // Common XC stroke (e.g., 190x45mm)
    stanchion_diameter_mm: 10, // Damper shaft diameter
    air_chamber_volume_cc: 150, // Approximate, XC-focused volume
    max_pressure_psi: 325,
    recommended_sag_percent: 25,
    spring_curve: 'linear'
  },
  'RockShox Deluxe Ultimate': {
    brand: 'RockShox',
    model: 'Deluxe Ultimate',
    travel_mm: 50, // Common Trail stroke (e.g., 210x50mm)
    stanchion_diameter_mm: 10, // Damper shaft diameter
    air_chamber_volume_cc: 170, // Approximate
    max_pressure_psi: 325,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  'RockShox Super Deluxe Ultimate': {
    brand: 'RockShox',
    model: 'Super Deluxe Ultimate',
    travel_mm: 65, // Common Enduro stroke (e.g., 230x65mm)
    stanchion_diameter_mm: 10, // Damper shaft diameter
    air_chamber_volume_cc: 270, // Approximate, can be tuned with DebonAir/MegNeg
    max_pressure_psi: 325,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  'RockShox Vivid Ultimate': {
    brand: 'RockShox',
    model: 'Vivid Ultimate',
    travel_mm: 65, // Common Enduro/DH stroke
    stanchion_diameter_mm: 10, // Damper shaft diameter
    air_chamber_volume_cc: 320, // Approximate, very large volume, coil-like feel
    max_pressure_psi: 275,
    recommended_sag_percent: 35,
    spring_curve: 'progressive'
  },
  
  // --- MARZOCCHI ---
  'Marzocchi Bomber Air': {
    brand: 'Marzocchi',
    model: 'Bomber Air',
    travel_mm: 55, // Common Trail/All-Mountain stroke
    stanchion_diameter_mm: 12.7, // Damper shaft, based on Fox Float X chassis
    air_chamber_volume_cc: 225, // Approximate, similar to Float X
    max_pressure_psi: 350,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  
  // --- ÖHLINS ---
  'Öhlins TTXAir 2': {
    brand: 'Öhlins',
    model: 'TTXAir 2',
    travel_mm: 60, // Common Enduro stroke
    stanchion_diameter_mm: 12.7, // Damper shaft diameter
    air_chamber_volume_cc: 250, // Approximate
    max_pressure_psi: 300,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  
  // --- CANE CREEK ---
  'Cane Creek Kitsuma Air': {
    brand: 'Cane Creek',
    model: 'Kitsuma Air',
    travel_mm: 65, // Common Enduro stroke
    stanchion_diameter_mm: 9.5, // Damper shaft diameter
    air_chamber_volume_cc: 290, // Approximate, high volume
    max_pressure_psi: 300,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  
  // --- DVO ---
  'DVO Topaz 2': {
    brand: 'DVO',
    model: 'Topaz 2',
    travel_mm: 55, // Common Trail/All-Mountain stroke
    stanchion_diameter_mm: 10, // Damper shaft diameter
    air_chamber_volume_cc: 240, // Approximate, has bladder instead of IFP
    max_pressure_psi: 300,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  
  // --- MANITOU ---
  'Manitou Mara Pro': {
    brand: 'Manitou',
    model: 'Mara Pro',
    travel_mm: 55, // Common Trail/All-Mountain stroke
    stanchion_diameter_mm: 12.7, // Damper shaft diameter
    air_chamber_volume_cc: 260, // Approximate, known for large volume
    max_pressure_psi: 300,
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  
  // --- COIL SHOCKS (Example Entries) ---
  'Fox DHX2': {
    brand: 'Fox',
    model: 'DHX2',
    travel_mm: 65, // Common Enduro/DH stroke
    stanchion_diameter_mm: 9, // Damper shaft diameter
    air_chamber_volume_cc: 0, // Not an air shock
    max_pressure_psi: 0, // Not an air shock
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  'RockShox Super Deluxe Coil Ultimate': {
    brand: 'RockShox',
    model: 'Super Deluxe Coil Ultimate',
    travel_mm: 65, // Common Enduro/DH stroke
    stanchion_diameter_mm: 10, // Damper shaft diameter
    air_chamber_volume_cc: 0, // Not an air shock
    max_pressure_psi: 0, // Not an air shock
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  },
  'Öhlins TTX22m.2': {
    brand: 'Öhlins',
    model: 'TTX22m.2',
    travel_mm: 65, // Common Enduro/DH stroke
    stanchion_diameter_mm: 12.7, // Damper shaft diameter
    air_chamber_volume_cc: 0, // Not an air shock
    max_pressure_psi: 0, // Not an air shock
    recommended_sag_percent: 30,
    spring_curve: 'progressive'
  }
}

export function getShockSpecs(brand: string, model: string, travel?: number): SuspensionSpecs | null {
  const key = `${brand} ${model}`
  const shock = SHOCK_DATABASE[key]
  
  if (shock && travel) {
    return {
      ...shock,
      travel_mm: travel
    }
  }
  
  return shock || null
}

export function calculateSuspensionSetup(inputs: SuspensionCalculationInputs): SuspensionResult {
  const { riderWeightLbs, gearWeightLbs, forkSpecs, shockSpecs, ridingStyle, targetSagPercent } = inputs
  const totalWeight = riderWeightLbs + gearWeightLbs

  // Use either fork or shock specs
  const suspensionSpecs = forkSpecs || shockSpecs
  
  if (!suspensionSpecs) {
    return {
      airPressure: 0,
      targetSag: 0,
      reboundClicks: 0,
      notes: ['No suspension specifications provided'],
      accuracy: 'low'
    }
  }

  const notes: string[] = []
  
  // Get the base pressure ratio for this stanchion size
  const stanchionSize = suspensionSpecs.stanchion_diameter_mm
  const basePressureRatio = SUSPENSION_CONSTANTS.BASE_PRESSURE_RATIOS[stanchionSize as keyof typeof SUSPENSION_CONSTANTS.BASE_PRESSURE_RATIOS] || 1.5
  
  // Get travel factor
  const travelFactor = SUSPENSION_CONSTANTS.TRAVEL_FACTORS[suspensionSpecs.travel_mm as keyof typeof SUSPENSION_CONSTANTS.TRAVEL_FACTORS] || 1.0
  
  // Get riding style factor
  const styleFactor = SUSPENSION_CONSTANTS.RIDING_STYLE_FACTORS[ridingStyle] || 1.0
  
  // Calculate base pressure
  let airPressure = totalWeight * basePressureRatio * travelFactor * styleFactor
  
  // Apply sag adjustments if custom target provided
  const targetSag = targetSagPercent || SUSPENSION_CONSTANTS.TARGET_SAG[ridingStyle] || 25
  const sagAdjustment = 25 / targetSag // Normalize to 25% baseline
  airPressure *= sagAdjustment

  // Ensure we don't exceed max pressure
  if (airPressure > suspensionSpecs.max_pressure_psi) {
    notes.push(`Pressure capped at ${suspensionSpecs.max_pressure_psi} PSI (manufacturer limit)`)
    airPressure = suspensionSpecs.max_pressure_psi
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
  const componentType = shockSpecs ? 'shock' : 'fork'
  notes.push(`Based on ${stanchionSize}mm ${componentType} and ${suspensionSpecs.travel_mm}mm travel`)
  notes.push(`Target sag: ${targetSag}% (${Math.round(suspensionSpecs.travel_mm * targetSag / 100)}mm)`)
  
  if (suspensionSpecs.spring_curve === 'progressive') {
    notes.push('Progressive spring curve - may feel more linear as you add pressure')
  }

  // Determine accuracy based on available data
  let accuracy: 'high' | 'medium' | 'low' = 'medium'
  if (suspensionSpecs.air_chamber_volume_cc && suspensionSpecs.baseline_pressure_chart) {
    accuracy = 'high'
  } else if (suspensionSpecs.stanchion_diameter_mm && suspensionSpecs.travel_mm) {
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