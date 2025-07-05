// src/app/calculators/suspension/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { 
  calculateSuspensionSetup, 
  getForkSpecs, 
  getShockSpecs,
  FORK_DATABASE,
  SHOCK_DATABASE,
  type SuspensionCalculationInputs,
  type SuspensionResult
} from '@/lib/suspension-logic'

interface SuspensionComponent {
  id: string
  brand: string
  model: string
  description: string
  manufacturer_pressure_chart?: string
  baseline_rebound_clicks?: number
  baseline_compression_clicks?: number
  component_categories: {
    name: string
  }
  shocks?: {
    travel_mm?: number
    stanchion_diameter_mm?: number
    max_pressure_psi?: number
    recommended_sag_percent?: number
    spring_curve?: 'linear' | 'progressive' | 'digressive'
  }
}

interface BikeComponent {
  components: SuspensionComponent
}

interface Bike {
  id: string
  nickname: string
  brand: string
  model: string
  bike_components: BikeComponent[]
}

export default function SuspensionCalculator() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  
  // Input states
  const [riderWeight, setRiderWeight] = useState(165)
  const [gearWeight, setGearWeight] = useState(7)
  const [ridingStyle, setRidingStyle] = useState<'xc' | 'trail' | 'enduro' | 'dh' | 'casual'>('trail')
  const [customSag, setCustomSag] = useState<number | undefined>(undefined)
  const [useGarageMode, setUseGarageMode] = useState(true)
  
  // Manual fork selection for non-garage mode
  const [manualForkBrand, setManualForkBrand] = useState('')
  const [manualForkModel, setManualForkModel] = useState('')
  const [manualTravel, setManualTravel] = useState(140)
  const [manualStanchionSize, setManualStanchionSize] = useState(34)
  
  // Manual shock selection for non-garage mode
  const [manualShockBrand, setManualShockBrand] = useState('')
  const [manualShockModel, setManualShockModel] = useState('')
  
  // Results
  const [forkResult, setForkResult] = useState<SuspensionResult | null>(null)
  const [shockResult, setShockResult] = useState<SuspensionResult | null>(null)
  
  // Shock brands and models for manual selection
  const shockBrands = ['Fox', 'RockShox']
  const shockModels: Record<string, string[]> = {
    'Fox': ['Float X2', 'Float DPS'],
    'RockShox': ['Super Deluxe', 'Deluxe']
  }
  
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
    } else {
      setProfile(profileData)
    }

    await loadBikes(user.id)
    setLoading(false)
  }

  const loadBikes = async (userId: string) => {
    const { data: bikesData, error } = await supabase
      .from('bikes')
      .select(`
        id,
        nickname,
        brand,
        model,
        bike_components (
          components (
            id,
            brand,
            model,
            description,
            manufacturer_pressure_chart,
            baseline_rebound_clicks,
            baseline_compression_clicks,
            component_categories (name)
          )
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching bikes:', error)
      return
    }

    const transformedBikes = (bikesData || []).map(bike => ({
      ...bike,
      bike_components: bike.bike_components.map((bc: any) => ({
        components: {
          ...bc.components,
          component_categories: bc.components.component_categories || { name: 'Unknown' }
        }
      }))
    }))

    // Filter bikes that have suspension components
    const mtbBikes = transformedBikes.filter((bike: Bike) => 
      bike.bike_components.some((bc: BikeComponent) => 
        bc.components.component_categories.name === 'Fork' || 
        bc.components.component_categories.name === 'Shock'
      )
    )

    setBikes(mtbBikes as Bike[])
  }

  const calculateSetup = () => {
    setCalculating(true)
    setForkResult(null)
    setShockResult(null)

    let forkComponent: SuspensionComponent | undefined

    if (useGarageMode && selectedBike) {
      // Use components from selected garage bike
      forkComponent = selectedBike.bike_components
        .map(bc => bc.components)
        .find(comp => comp.component_categories.name === 'Fork')
    } else {
      // Use manual inputs
      if (manualForkBrand && manualForkModel) {
        forkComponent = {
          id: 'manual',
          brand: manualForkBrand,
          model: manualForkModel,
          description: `${manualForkBrand} ${manualForkModel}`,
          component_categories: { name: 'Fork' }
        }
      }
    }

    // Calculate fork setup
    if (forkComponent) {
      // Try to get detailed specs from our database
      let forkSpecs = getForkSpecs(forkComponent.brand, forkComponent.model, manualTravel)
      
      // If not in database, create specs from component data
      if (!forkSpecs) {
        forkSpecs = {
          brand: forkComponent.brand,
          model: forkComponent.model,
          travel_mm: manualTravel,
          stanchion_diameter_mm: manualStanchionSize,
          max_pressure_psi: 300, // Safe default
          recommended_sag_percent: 25,
          spring_curve: 'linear' as const
        }
      }

      const inputs: SuspensionCalculationInputs = {
        riderWeightLbs: riderWeight,
        gearWeightLbs: gearWeight,
        forkSpecs,
        ridingStyle,
        targetSagPercent: customSag
      }

      const result = calculateSuspensionSetup(inputs)
      setForkResult(result)
    }

    // Shock calculation logic
    if (selectedBike && useGarageMode) {
      const allProducts = selectedBike.bike_components.map(bc => bc.components);
      const shockComponent = allProducts.find(comp => comp.component_categories.name === 'Shock');
      if (shockComponent) {
        const shockInputs: SuspensionCalculationInputs = {
          riderWeightLbs: riderWeight,
          gearWeightLbs: gearWeight,
          shockSpecs: {
            brand: shockComponent.brand || 'Unknown',
            model: shockComponent.model || 'Unknown',
            travel_mm: shockComponent.shocks?.travel_mm || 150,
            stanchion_diameter_mm: shockComponent.shocks?.stanchion_diameter_mm || 40,
            max_pressure_psi: shockComponent.shocks?.max_pressure_psi || 300,
            recommended_sag_percent: shockComponent.shocks?.recommended_sag_percent || 30,
            spring_curve: shockComponent.shocks?.spring_curve || 'progressive'
          },
          ridingStyle,
          targetSagPercent: customSag
        }

        const shockResult = calculateSuspensionSetup(shockInputs);
        setShockResult(shockResult);
      }
    } else if (!useGarageMode && manualShockBrand && manualShockModel) {
      // Manual shock calculation
      const shockKey = `${manualShockBrand} ${manualShockModel}`;
      const shockSpecs = SHOCK_DATABASE[shockKey];
      
      if (shockSpecs) {
        const shockInputs: SuspensionCalculationInputs = {
          riderWeightLbs: riderWeight,
          gearWeightLbs: gearWeight,
          shockSpecs,
          ridingStyle,
          targetSagPercent: customSag
        }

        const shockResult = calculateSuspensionSetup(shockInputs);
        setShockResult(shockResult);
      }
    }

    setCalculating(false)
  }

  const getAccuracyBadge = (accuracy: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800', 
      low: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[accuracy]}`}>
        {accuracy.toUpperCase()} ACCURACY
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading suspension calculator...</p>
        </div>
      </div>
    )
  }

  if (profile?.subscription_status !== 'premium') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} profile={profile} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Premium Feature</h1>
            <p className="text-lg text-gray-600 mb-8">
              The Suspension Setup Guide is available to Premium subscribers only.
            </p>
            <Link 
              href="/upgrade" 
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Upgrade to Premium
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} profile={profile} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/calculators" className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 inline-block">
            ← Back to All Calculators
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
            Suspension Setup Guide
          </h1>
          <p className="text-lg text-gray-600">
            Get baseline suspension settings based on physics and manufacturer data.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Setup Parameters</h2>
            
            {/* Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Data Source</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={useGarageMode}
                    onChange={() => setUseGarageMode(true)}
                    className="mr-2"
                  />
                  Use bike from my garage
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!useGarageMode}
                    onChange={() => setUseGarageMode(false)}
                    className="mr-2"
                  />
                  Enter fork details manually
                </label>
              </div>
            </div>

            {/* Garage Mode */}
            {useGarageMode && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Bike</label>
                <select
                  value={selectedBike?.id || ''}
                  onChange={(e) => {
                    const bike = bikes.find(b => b.id === e.target.value)
                    setSelectedBike(bike || null)
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose a bike...</option>
                  {bikes.map(bike => (
                    <option key={bike.id} value={bike.id}>
                      {bike.nickname} ({bike.brand} {bike.model})
                    </option>
                  ))}
                </select>
                
                {selectedBike && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium">Suspension Components:</p>
                    {selectedBike.bike_components
                      .filter(bc => ['Fork', 'Shock'].includes(bc.components.component_categories.name))
                      .map(bc => (
                        <p key={bc.components.id} className="text-sm text-gray-600">
                          {bc.components.component_categories.name}: {bc.components.brand} {bc.components.model}
                        </p>
                      ))
                    }
                  </div>
                )}
              </div>
            )}

            {/* Manual Mode */}
            {!useGarageMode && (
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <select
                      value={manualForkBrand}
                      onChange={(e) => setManualForkBrand(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select brand...</option>
                      <option value="Fox">Fox</option>
                      <option value="RockShox">RockShox</option>
                      <option value="Manitou">Manitou</option>
                      <option value="DVO">DVO</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={manualForkModel}
                      onChange={(e) => setManualForkModel(e.target.value)}
                      placeholder="e.g., 34 Float, Pike"
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Travel (mm)</label>
                    <select
                      value={manualTravel}
                      onChange={(e) => setManualTravel(parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value={80}>80mm</option>
                      <option value={100}>100mm</option>
                      <option value={120}>120mm</option>
                      <option value={130}>130mm</option>
                      <option value={140}>140mm</option>
                      <option value={150}>150mm</option>
                      <option value={160}>160mm</option>
                      <option value={170}>170mm</option>
                      <option value={180}>180mm</option>
                      <option value={200}>200mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stanchion Ø (mm)</label>
                    <select
                      value={manualStanchionSize}
                      onChange={(e) => setManualStanchionSize(parseInt(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value={30}>30mm</option>
                      <option value={32}>32mm</option>
                      <option value={34}>34mm</option>
                      <option value={35}>35mm</option>
                      <option value={36}>36mm</option>
                      <option value={38}>38mm</option>
                      <option value={40}>40mm</option>
                    </select>
                  </div>
                </div>

                {/* Manual Shock Selection */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shock Brand</label>
                    <select
                      value={manualShockBrand}
                      onChange={(e) => {
                        setManualShockBrand(e.target.value)
                        setManualShockModel('') // Reset model when brand changes
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select shock brand...</option>
                      {shockBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shock Model</label>
                    <select
                      value={manualShockModel}
                      onChange={(e) => setManualShockModel(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      disabled={!manualShockBrand}
                    >
                      <option value="">Select shock model...</option>
                      {manualShockBrand && shockModels[manualShockBrand]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Weight Inputs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rider Weight (lbs)
                </label>
                <input
                  type="number"
                  value={riderWeight}
                  onChange={(e) => setRiderWeight(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="90"
                  max="330"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gear Weight (lbs)
                </label>
                <input
                  type="number"
                  value={gearWeight}
                  onChange={(e) => setGearWeight(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="0"
                  max="45"
                />
              </div>
            </div>

            {/* Riding Style */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Riding Style</label>
              <select
                value={ridingStyle}
                onChange={(e) => setRidingStyle(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="xc">Cross Country (efficiency focused)</option>
                <option value="trail">Trail (balanced)</option>
                <option value="enduro">Enduro (descending focused)</option>
                <option value="dh">Downhill (big hits)</option>
                <option value="casual">Casual (comfort focused)</option>
              </select>
            </div>

            {/* Custom Sag */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Sag % (optional)
              </label>
              <input
                type="number"
                value={customSag || ''}
                onChange={(e) => setCustomSag(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Leave empty for recommended"
                className="w-full p-2 border border-gray-300 rounded-md"
                min="15"
                max="35"
              />
            </div>

            <button
              onClick={calculateSetup}
              disabled={calculating || (useGarageMode && !selectedBike) || (!useGarageMode && (!manualForkBrand || !manualForkModel))}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {calculating ? 'Calculating...' : 'Calculate Setup'}
            </button>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {forkResult && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">Fork Setup</h3>
                  {getAccuracyBadge(forkResult.accuracy)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{forkResult.airPressure}</div>
                    <div className="text-sm text-gray-600">PSI</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{forkResult.targetSag}%</div>
                    <div className="text-sm text-gray-600">Target Sag</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Rebound Clicks: {forkResult.reboundClicks}</p>
                  <p className="text-xs text-gray-500">From fully closed (slow)</p>
                </div>

                <div className="space-y-2">
                  {forkResult.notes.map((note, index) => (
                    <p key={index} className="text-sm text-gray-600">• {note}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Shock Results */}
            {shockResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Rear Shock Setup</h3>
                  {getAccuracyBadge(shockResult.accuracy)}
                </div>

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800 font-medium">Air Pressure</div>
                    <div className="text-2xl font-bold text-blue-600">{shockResult.airPressure}</div>
                    <div className="text-xs text-blue-700">PSI</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-800 font-medium">Target Sag</div>
                    <div className="text-2xl font-bold text-green-600">{shockResult.targetSag}</div>
                    <div className="text-xs text-green-700">%</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-sm text-orange-800 font-medium">Rebound</div>
                    <div className="text-2xl font-bold text-orange-600">{shockResult.reboundClicks}</div>
                    <div className="text-xs text-orange-700">clicks from fast</div>
                  </div>
                  {shockResult.compressionClicks && (
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-sm text-purple-800 font-medium">Compression</div>
                      <div className="text-2xl font-bold text-purple-600">{shockResult.compressionClicks}</div>
                      <div className="text-xs text-purple-700">clicks from open</div>
                    </div>
                  )}
                </div>

                {shockResult.notes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Setup Notes:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {shockResult.notes.map((note, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-indigo-500 mt-1">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!forkResult && !shockResult && !calculating && (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                <div className="text-4xl mb-2">🏔️</div>
                <p>Enter your details and click Calculate Setup to get recommendations</p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">How This Works</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Physics-Based:</strong> Uses stanchion diameter, travel, and air volume for accurate calculations</p>
                <p><strong>Manufacturer Data:</strong> References real fork specifications when available</p>
                <p><strong>Riding Style:</strong> Adjusts pressure based on your intended use</p>
                <p><strong>Pro Tip:</strong> Start with these settings, then fine-tune based on feel</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}