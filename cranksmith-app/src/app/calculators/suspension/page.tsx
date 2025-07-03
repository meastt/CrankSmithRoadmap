// src/app/calculators/suspension/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'

interface SuspensionComponent {
  id: string
  brand: string
  model: string
  description: string
  manufacturer_pressure_chart?: string
  baseline_rebound_clicks?: number
  baseline_compression_clicks?: number
}

interface Bike {
  id: string
  nickname: string
  brand: string
  model: string
  bike_components: {
    components: SuspensionComponent & {
      component_categories: { name: string }
    }
  }[]
}

interface SuspensionSetup {
  airPressure: number
  reboundClicks: number
  compressionClicks?: number
  sag: number
  notes: string[]
}

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  subscription_status?: 'free' | 'premium'
}

export default function SuspensionCalculator() {
  const [, setUser] = useState<User | null>(null)
  const [, setProfile] = useState<Profile | null>(null)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [riderWeight, setRiderWeight] = useState(75) // kg
  const [gearWeight, setGearWeight] = useState(3) // kg (helmet, pack, water, etc.)
  const [useGarageMode, ] = useState(false)
  const [manualFork, ] = useState('')
  const [manualShock, ] = useState('')
  const [forkSetup, setForkSetup] = useState<SuspensionSetup | null>(null)
  const [shockSetup, setShockSetup] = useState<SuspensionSetup | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      await fetchBikes(user.id)
      setLoading(false)
    }

    fetchData()
  }, [router])

  const fetchBikes = async (userId: string) => {
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

    // Filter bikes that have suspension components and transform data
    const mtbBikes = bikesData?.filter((bike: any) => 
      bike.bike_components?.some((bc: any) => 
        bc.components?.component_categories?.name === 'Fork' || 
        bc.components?.component_categories?.name === 'Shock'
      )
    ).map((bike: any) => ({
      id: bike.id,
      nickname: bike.nickname,
      brand: bike.brand,
      model: bike.model,
      bike_components: bike.bike_components.map((bc: any) => ({
        components: {
          id: bc.components.id,
          brand: bc.components.brand,
          model: bc.components.model,
          description: bc.components.description,
          manufacturer_pressure_chart: bc.components.manufacturer_pressure_chart,
          baseline_rebound_clicks: bc.components.baseline_rebound_clicks,
          baseline_compression_clicks: bc.components.baseline_compression_clicks,
          component_categories: { name: bc.components.component_categories.name }
        }
      }))
    })) || []

    setBikes(mtbBikes)
  }

  const selectBike = (bike: Bike) => {
    setSelectedBike(bike)
    // Clear previous calculations when switching bikes
    setForkSetup(null)
    setShockSetup(null)
  }

  const calculateSuspensionSetup = () => {
    setCalculating(true)
    
    const totalWeight = riderWeight + gearWeight
    
    let forkComponent: SuspensionComponent | undefined
    let shockComponent: SuspensionComponent | undefined

    if (useGarageMode && selectedBike) {
      // Use components from selected garage bike
      forkComponent = selectedBike.bike_components.find(
        bc => bc.components.component_categories.name === 'Fork'
      )?.components

      shockComponent = selectedBike.bike_components.find(
        bc => bc.components.component_categories.name === 'Shock'
      )?.components
    } else {
      // Use manual inputs - create mock components for calculation
      if (manualFork) {
        const [brand, model] = manualFork.split(' - ')
        forkComponent = {
          id: 'manual-fork',
          brand: brand || 'Generic',
          model: model || 'Fork',
          description: manualFork,
          baseline_rebound_clicks: 8
        }
      }
      
      if (manualShock) {
        const [brand, model] = manualShock.split(' - ')
        shockComponent = {
          id: 'manual-shock',
          brand: brand || 'Generic',
          model: model || 'Shock',
          description: manualShock,
          baseline_rebound_clicks: 8,
          baseline_compression_clicks: 6
        }
      }
    }

    // Calculate fork setup
    if (forkComponent) {
      const forkPressure = calculateForkPressure(totalWeight, forkComponent)
      const reboundClicks = forkComponent.baseline_rebound_clicks || 8
      
      setForkSetup({
        airPressure: forkPressure,
        reboundClicks: reboundClicks,
        sag: 25, // Target 25% sag for most trail riding
        notes: generateForkNotes(forkComponent)
      })
    }

    // Calculate shock setup
    if (shockComponent) {
      const shockPressure = calculateShockPressure(totalWeight, shockComponent)
      const reboundClicks = shockComponent.baseline_rebound_clicks || 8
      const compressionClicks = shockComponent.baseline_compression_clicks || 6
      
      setShockSetup({
        airPressure: shockPressure,
        reboundClicks: reboundClicks,
        compressionClicks: compressionClicks,
        sag: 30, // Target 30% sag for rear shock
        notes: generateShockNotes(shockComponent)
      })
    }

    setCalculating(false)
  }

  const calculateForkPressure = (weightKg: number, fork: SuspensionComponent): number => {
    // Simplified pressure calculation - real apps would use manufacturer lookup tables
    let basePressure = Math.round(weightKg * 1.1) // Basic multiplier
    
    // Brand-specific adjustments based on known characteristics
    if (fork.brand === 'RockShox') {
      basePressure = Math.round(weightKg * 1.0) // RockShox runs slightly lower
    } else if (fork.brand === 'Fox') {
      basePressure = Math.round(weightKg * 1.15) // Fox typically needs more pressure
    }
    
    return Math.max(50, Math.min(200, basePressure)) // Clamp between 50-200 PSI
  }

  const calculateShockPressure = (weightKg: number, shock: SuspensionComponent): number => {
    // Rear shocks typically need more pressure than forks
    let basePressure = Math.round(weightKg * 2.8)
    
    if (shock.brand === 'RockShox') {
      basePressure = Math.round(weightKg * 2.7)
    } else if (shock.brand === 'Fox') {
      basePressure = Math.round(weightKg * 2.9)
    }
    
    return Math.max(100, Math.min(350, basePressure))
  }

  const generateForkNotes = (fork: SuspensionComponent): string[] => {
    const notes = [
      'Start with this baseline and adjust to achieve 25% sag',
      'Check sag by measuring fork compression when seated on bike',
      'Add 5-10 PSI for more aggressive riding, reduce for comfort'
    ]
    
    if (fork.manufacturer_pressure_chart) {
      notes.push('Consult manufacturer pressure chart for precise recommendations')
    }
    
    return notes
  }

  const generateShockNotes = (shock: SuspensionComponent): string[] => {
    const notes = [
      'Target 30% sag for trail riding (25% for XC, 35% for enduro)',
      'Set rebound so wheel returns quickly but doesn\'t bounce',
      'Adjust compression for terrain - more for rough trails'
    ]
    
    if (shock.manufacturer_pressure_chart) {
      notes.push('Check manufacturer setup guide for detailed tuning')
    }
    
    return notes
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const hasSuspension = useGarageMode 
    ? selectedBike?.bike_components.some(bc => 
        bc.components.component_categories.name === 'Fork' || 
        bc.components.component_categories.name === 'Shock'
      )
    : manualFork || manualShock

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/calculators" className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block">
            ← Back to Calculators
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Suspension Setup Guide
          </h1>
          <p className="text-gray-600">
            Get baseline suspension settings for your MTB.
          </p>
          <div className="mt-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              Premium Feature
            </span>
          </div>
        </div>

        {bikes.length === 0 && !useGarageMode ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-4">🏔️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Suspension Setup Calculator
            </h3>
            <p className="text-gray-600 mb-4">
              Enter your suspension components manually or add bikes to your garage for easier setup.
            </p>
            <Link 
              href="/garage"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Go to Garage
            </Link>
          </div>
        ) : bikes.length === 0 && useGarageMode ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-4">🏔️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No MTB Bikes Found
            </h3>
            <p className="text-gray-600 mb-4">
              Add a mountain bike with fork and/or shock components to use this calculator.
            </p>
            <Link 
              href="/garage"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Go to Garage
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Setup Inputs
                </h2>

                {/* Bike Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Bike
                  </label>
                  <select
                    value={selectedBike?.id || ''}
                    onChange={(e) => {
                      const bike = bikes.find(b => b.id === e.target.value)
                      if (bike) selectBike(bike)
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {bikes.map(bike => (
                      <option key={bike.id} value={bike.id}>
                        {bike.nickname} ({bike.brand} {bike.model})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weight Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rider Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={riderWeight}
                      onChange={(e) => setRiderWeight(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="40"
                      max="150"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gear Weight (kg)
                      <span className="text-gray-500 text-xs ml-1">(helmet, pack, water, etc.)</span>
                    </label>
                    <input
                      type="number"
                      value={gearWeight}
                      onChange={(e) => setGearWeight(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="0"
                      max="20"
                    />
                  </div>
                </div>

                {/* Suspension Components Info */}
                {selectedBike && hasSuspension && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Suspension Components
                    </h3>
                    {selectedBike.bike_components
                      .filter(bc => ['Fork', 'Shock'].includes(bc.components.component_categories.name))
                      .map(bc => (
                        <div key={bc.components.id} className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-700">
                            {bc.components.component_categories.name}: {bc.components.brand} {bc.components.model}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                )}

                <button
                  onClick={calculateSuspensionSetup}
                  disabled={calculating || !selectedBike || !hasSuspension}
                  className="w-full mt-6 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {calculating ? 'Calculating...' : 'Calculate Setup'}
                </button>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {/* Fork Setup */}
              {forkSetup && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🍴</span>
                    Fork Setup
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {forkSetup.airPressure} PSI
                      </div>
                      <div className="text-sm text-blue-700">Air Pressure</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {forkSetup.reboundClicks}
                      </div>
                      <div className="text-sm text-green-700">Rebound Clicks</div>
                    </div>
                  </div>

                  <div className="text-center p-3 bg-orange-50 rounded-lg mb-4">
                    <div className="text-lg font-semibold text-orange-600">
                      Target: {forkSetup.sag}% Sag
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Setup Notes:</h4>
                    {forkSetup.notes.map((note, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shock Setup */}
              {shockSetup && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🔧</span>
                    Shock Setup
                  </h2>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">
                        {shockSetup.airPressure} PSI
                      </div>
                      <div className="text-xs text-blue-700">Air Pressure</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        {shockSetup.reboundClicks}
                      </div>
                      <div className="text-xs text-green-700">Rebound</div>
                    </div>
                    {shockSetup.compressionClicks && (
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-xl font-bold text-purple-600">
                          {shockSetup.compressionClicks}
                        </div>
                        <div className="text-xs text-purple-700">Compression</div>
                      </div>
                    )}
                  </div>

                  <div className="text-center p-3 bg-orange-50 rounded-lg mb-4">
                    <div className="text-lg font-semibold text-orange-600">
                      Target: {shockSetup.sag}% Sag
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Setup Notes:</h4>
                    {shockSetup.notes.map((note, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Suspension Setup Guide
                </h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>Sag:</strong> The amount your suspension compresses under your weight</p>
                  <p><strong>Rebound:</strong> How fast your suspension returns after compression</p>
                  <p><strong>Compression:</strong> How your suspension reacts to impacts</p>
                  <p><strong>Pro Tip:</strong> Always start with manufacturer recommendations and fine-tune from there</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}