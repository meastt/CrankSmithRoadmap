// src/app/calculators/tire-pressure/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'

interface Bike {
  id: string
  nickname: string
  brand: string
  model: string
  bike_components: {
    components: {
      id: string
      brand: string
      model: string
      tire_width_mm?: number
      min_pressure_psi?: number
      max_pressure_psi?: number
      casing_type?: string
      internal_rim_width_mm?: number
      rim_type?: string
      component_categories: {
        name: string
      }
    }
  }[]
}

interface CalculationInputs {
  riderWeight: number
  bikeWeight: number
  tireWidth: number
  rimWidth: number
  surfaceType: string
  ridingStyle: string
  isHookless: boolean
}

interface PressureResult {
  front: number
  rear: number
  notes: string[]
}

export default function TirePressureCalculator() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState<PressureResult | null>(null)
  const router = useRouter()

  // Form inputs
  const [inputs, setInputs] = useState<CalculationInputs>({
    riderWeight: 70,
    bikeWeight: 8,
    tireWidth: 25,
    rimWidth: 19,
    surfaceType: 'road',
    ridingStyle: 'comfort',
    isHookless: false
  })

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

      // Fetch bikes with tire and rim components (premium feature)
      if (profileData?.subscription_status === 'premium') {
        await fetchBikes(user.id)
      }

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
            tire_width_mm,
            min_pressure_psi,
            max_pressure_psi,
            casing_type,
            internal_rim_width_mm,
            rim_type,
            component_categories (name)
          )
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching bikes:', error)
      return
    }

    setBikes((bikesData as Bike[]) || [])
  }

  const selectBike = (bike: Bike) => {
    setSelectedBike(bike)
    
    // Auto-fill tire and rim data from selected bike
    const tireComponent = bike.bike_components.find(
      bc => bc.components.component_categories.name === 'Tire'
    )?.components

    const wheelComponent = bike.bike_components.find(
      bc => bc.components.component_categories.name === 'Wheelset'
    )?.components

    if (tireComponent || wheelComponent) {
      setInputs(prev => ({
        ...prev,
        tireWidth: tireComponent?.tire_width_mm || prev.tireWidth,
        rimWidth: wheelComponent?.internal_rim_width_mm || prev.rimWidth,
        isHookless: wheelComponent?.rim_type === 'hookless'
      }))
    }
  }

  const calculatePressure = () => {
    setCalculating(true)
    
    // Basic tire pressure calculation algorithm
    // This is a simplified version - real-world calculators use more complex formulas
    const totalWeight = inputs.riderWeight + inputs.bikeWeight
    const baselinePressure = Math.round((totalWeight * 0.8) + (inputs.tireWidth * 0.3))
    
    // Adjustments based on riding style
    let adjustment = 0
    switch (inputs.ridingStyle) {
      case 'comfort':
        adjustment = -5
        break
      case 'balanced':
        adjustment = 0
        break
      case 'performance':
        adjustment = +5
        break
    }

    // Surface adjustments
    switch (inputs.surfaceType) {
      case 'road':
        adjustment += 0
        break
      case 'gravel':
        adjustment -= 10
        break
      case 'mixed':
        adjustment -= 5
        break
    }

    // Rim width adjustments (premium feature consideration)
    if (profile?.subscription_status === 'premium' && inputs.rimWidth) {
      if (inputs.rimWidth < 17) adjustment += 3
      if (inputs.rimWidth > 21) adjustment -= 3
    }

    const frontPressure = Math.max(20, baselinePressure + adjustment - 3)
    const rearPressure = Math.max(20, baselinePressure + adjustment + 2)

    const notes = []
    if (inputs.isHookless) {
      notes.push('Hookless rim detected - ensure tire compatibility and never exceed 65 PSI')
    }
    if (inputs.surfaceType === 'gravel') {
      notes.push('Lower pressure improves comfort and traction on rough surfaces')
    }
    if (profile?.subscription_status !== 'premium') {
      notes.push('Upgrade to Premium for more accurate calculations using your exact tire and rim specs')
    }

    setResult({
      front: frontPressure,
      rear: rearPressure,
      notes
    })

    setCalculating(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/calculators" className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block">
            ← Back to Calculators
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tire Pressure Calculator
          </h1>
          <p className="text-gray-600">
            Get optimal tire pressure recommendations for your ride.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Calculation Inputs
            </h2>

            {/* Premium Bike Selection */}
            {profile?.subscription_status === 'premium' && bikes.length > 0 && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-900 mb-3">
                  Premium: Auto-fill from Your Garage
                </h3>
                <select
                  value={selectedBike?.id || ''}
                  onChange={(e) => {
                    const bike = bikes.find(b => b.id === e.target.value)
                    if (bike) selectBike(bike)
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a bike to auto-fill data...</option>
                  {bikes.map(bike => (
                    <option key={bike.id} value={bike.id}>
                      {bike.nickname} ({bike.brand} {bike.model})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Basic Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rider Weight (kg)
                </label>
                <input
                  type="number"
                  value={inputs.riderWeight}
                  onChange={(e) => setInputs(prev => ({ ...prev, riderWeight: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="30"
                  max="150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bike Weight (kg)
                </label>
                <input
                  type="number"
                  value={inputs.bikeWeight}
                  onChange={(e) => setInputs(prev => ({ ...prev, bikeWeight: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="3"
                  max="25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tire Width (mm)
                </label>
                <input
                  type="number"
                  value={inputs.tireWidth}
                  onChange={(e) => setInputs(prev => ({ ...prev, tireWidth: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="20"
                  max="60"
                />
              </div>

              {profile?.subscription_status === 'premium' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Rim Width (mm)
                      <span className="ml-1 text-purple-600 text-xs">PREMIUM</span>
                    </label>
                    <input
                      type="number"
                      value={inputs.rimWidth}
                      onChange={(e) => setInputs(prev => ({ ...prev, rimWidth: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      min="13"
                      max="30"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={inputs.isHookless}
                        onChange={(e) => setInputs(prev => ({ ...prev, isHookless: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Hookless Rim
                        <span className="ml-1 text-purple-600 text-xs">PREMIUM</span>
                      </span>
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surface Type
                </label>
                <select
                  value={inputs.surfaceType}
                  onChange={(e) => setInputs(prev => ({ ...prev, surfaceType: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="road">Road/Tarmac</option>
                  <option value="gravel">Gravel</option>
                  <option value="mixed">Mixed Terrain</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Riding Style
                </label>
                <select
                  value={inputs.ridingStyle}
                  onChange={(e) => setInputs(prev => ({ ...prev, ridingStyle: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="comfort">Comfort (Lower pressure)</option>
                  <option value="balanced">Balanced</option>
                  <option value="performance">Performance (Higher pressure)</option>
                </select>
              </div>
            </div>

            <button
              onClick={calculatePressure}
              disabled={calculating}
              className="w-full mt-6 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {calculating ? 'Calculating...' : 'Calculate Pressure'}
            </button>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {result && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Recommended Pressure
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.front} PSI
                    </div>
                    <div className="text-sm text-blue-700">Front Tire</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {result.rear} PSI
                    </div>
                    <div className="text-sm text-green-700">Rear Tire</div>
                  </div>
                </div>

                {result.notes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">Notes:</h3>
                    {result.notes.map((note, index) => (
                      <div key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Premium Upsell */}
            {profile?.subscription_status !== 'premium' && (
              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3">
                  Unlock Premium Features
                </h3>
                <ul className="text-sm text-purple-700 space-y-2 mb-4">
                  <li className="flex items-center space-x-2">
                    <span className="text-purple-500">✓</span>
                    <span>Auto-fill from your garage bikes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-purple-500">✓</span>
                    <span>Advanced rim width calculations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-purple-500">✓</span>
                    <span>Hookless rim safety warnings</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-purple-500">✓</span>
                    <span>Tire-specific pressure ranges</span>
                  </li>
                </ul>
                <Link
                  href="/upgrade"
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Upgrade to Premium
                </Link>
              </div>
            )}

            {/* Educational Content */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Tire Pressure Tips
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• Lower pressure = more comfort and better traction</p>
                <p>• Higher pressure = lower rolling resistance</p>
                <p>• Check pressure before every ride</p>
                <p>• Temperature affects pressure (±1 PSI per 10°F)</p>
                <p>• Never exceed tire or rim manufacturer limits</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}