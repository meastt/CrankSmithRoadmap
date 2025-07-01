// Save this as: src/app/calculators/gear/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Component {
  id: string
  brand: string
  model: string
  cogs?: string
  chainrings?: string
  circumference_mm?: number
}

interface BikeComponent {
  components: Component
}

interface Bike {
  id: string
  nickname: string
  brand: string
  model: string
  bike_components: BikeComponent[]
}

interface GearSetup {
  crankset?: Component
  cassette?: Component
  wheelset?: Component
}

interface GearRatio {
  gear: number
  chainring: number
  cog: number
  ratio: number
  speedKph: number
  speedMph: number
}

export default function GearCalculator() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null)
  const [currentSetup, setCurrentSetup] = useState<GearSetup>({})
  const [proposedSetup, setProposedSetup] = useState<GearSetup>({})
  const [availableComponents, setAvailableComponents] = useState<{
    cranksets: Component[]
    cassettes: Component[]
    wheelsets: Component[]
  }>({ cranksets: [], cassettes: [], wheelsets: [] })
  const [cadence, setCadence] = useState(90)
  const [currentGears, setCurrentGears] = useState<GearRatio[]>([])
  const [proposedGears, setProposedGears] = useState<GearRatio[]>([])
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    // Check if user has premium access
    if (profileData?.subscription_status !== 'premium') {
      setShowUpgradeModal(true)
      return
    }

    await Promise.all([
      fetchUserBikes(user.id),
      fetchAvailableComponents()
    ])
    
    setLoading(false)
  }

  const fetchUserBikes = async (userId: string) => {
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
            cogs,
            chainrings,
            circumference_mm,
            component_categories (name)
          )
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching bikes:', error)
      return
    }

    setBikes(bikesData || [])
    
    // Auto-select first bike if available
    if (bikesData && bikesData.length > 0) {
      selectBike(bikesData[0])
    }
  }

  const fetchAvailableComponents = async () => {
    // Fetch cranksets
    const { data: cranksetData } = await supabase
      .from('components')
      .select(`
        id, brand, model, chainrings,
        component_categories!inner (name)
      `)
      .eq('component_categories.name', 'Crankset')
      .not('chainrings', 'is', null)

    // Fetch cassettes
    const { data: cassetteData } = await supabase
      .from('components')
      .select(`
        id, brand, model, cogs,
        component_categories!inner (name)
      `)
      .eq('component_categories.name', 'Cassette')
      .not('cogs', 'is', null)

    // Fetch wheelsets
    const { data: wheelsetData } = await supabase
      .from('components')
      .select(`
        id, brand, model, circumference_mm,
        component_categories!inner (name)
      `)
      .eq('component_categories.name', 'Wheelset')
      .not('circumference_mm', 'is', null)

    setAvailableComponents({
      cranksets: cranksetData || [],
      cassettes: cassetteData || [],
      wheelsets: wheelsetData || []
    })
  }

  const selectBike = (bike: Bike) => {
    setSelectedBike(bike)
    
    // Extract current components from bike
    const setup: GearSetup = {}
    
    bike.bike_components.forEach(({ components }) => {
      if (components.chainrings) setup.crankset = components
      if (components.cogs) setup.cassette = components  
      if (components.circumference_mm) setup.wheelset = components
    })
    
    setCurrentSetup(setup)
    calculateGears(setup, 'current')
  }

  const calculateGears = (setup: GearSetup, type: 'current' | 'proposed') => {
    if (!setup.crankset?.chainrings || !setup.cassette?.cogs || !setup.wheelset?.circumference_mm) {
      if (type === 'current') setCurrentGears([])
      else setProposedGears([])
      return
    }

    const chainrings = parseChainrings(setup.crankset.chainrings)
    const cogs = parseCogs(setup.cassette.cogs)
    const circumference = setup.wheelset.circumference_mm

    const gears: GearRatio[] = []
    let gearNumber = 1

    chainrings.forEach(chainring => {
      cogs.forEach(cog => {
        const ratio = chainring / cog
        const speedKph = (ratio * cadence * circumference * 60) / 1000000
        const speedMph = speedKph * 0.621371

        gears.push({
          gear: gearNumber++,
          chainring,
          cog,
          ratio,
          speedKph,
          speedMph
        })
      })
    })

    // Sort by ratio (easiest to hardest)
    gears.sort((a, b) => a.ratio - b.ratio)

    if (type === 'current') setCurrentGears(gears)
    else setProposedGears(gears)
  }

  const parseChainrings = (chainrings: string): number[] => {
    if (chainrings.includes('/')) {
      return chainrings.split('/').map(ring => parseInt(ring.replace('T', '')))
    }
    return [parseInt(chainrings.replace('T', ''))]
  }

  const parseCogs = (cogs: string): number[] => {
    // Handle different formats: "11-34T" or "11-12-13-14-15-17-19-21-24-27-30-34"
    if (cogs.includes('-') && cogs.split('-').length > 2) {
      // Full cog listing
      return cogs.split('-').map(cog => parseInt(cog.replace('T', '')))
    } else if (cogs.includes('-')) {
      // Range format like "11-34T"
      const [min, max] = cogs.split('-').map(cog => parseInt(cog.replace('T', '')))
      // Generate reasonable cog progression
      const cogArray = [min]
      let current = min
      while (current < max) {
        if (current < 16) current += 1
        else if (current < 24) current += 2
        else current += 3
        if (current <= max) cogArray.push(current)
      }
      if (cogArray[cogArray.length - 1] !== max) cogArray.push(max)
      return cogArray
    }
    return [parseInt(cogs.replace('T', ''))]
  }

  const updateProposedComponent = (type: 'crankset' | 'cassette' | 'wheelset', componentId: string) => {
    const component = availableComponents[type + 's' as keyof typeof availableComponents]
      .find(c => c.id === componentId)
    
    if (component) {
      const newSetup = { ...proposedSetup, [type]: component }
      setProposedSetup(newSetup)
      calculateGears(newSetup, 'proposed')
    }
  }

  const getGearComparison = () => {
    if (currentGears.length === 0 || proposedGears.length === 0) return null

    const currentEasiest = currentGears[0]
    const currentHardest = currentGears[currentGears.length - 1]
    const proposedEasiest = proposedGears[0]
    const proposedHardest = proposedGears[proposedGears.length - 1]

    const easierClimbing = ((currentEasiest.ratio - proposedEasiest.ratio) / currentEasiest.ratio) * 100
    const fasterTopEnd = ((proposedHardest.ratio - currentHardest.ratio) / currentHardest.ratio) * 100

    return { easierClimbing, fasterTopEnd }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">Loading Gear Calculator...</p>
        </div>
      </div>
    )
  }

  if (showUpgradeModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h2>
          <p className="text-gray-600 mb-6">
            The Gear Calculator is available to Premium subscribers only. 
            Upgrade to access this powerful tool for comparing gear setups!
          </p>
          <div className="flex flex-col gap-4">
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
              Upgrade to Premium
            </button>
            <Link href="/garage" className="text-indigo-600 hover:text-indigo-700">
              Back to Garage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">⚙️ Gear Calculator</h1>
            <p className="text-gray-200 mt-2">Compare your current setup with potential upgrades</p>
          </div>
          <Link href="/garage" className="text-indigo-300 hover:text-indigo-200">
            ← Back to Garage
          </Link>
        </div>

        {/* Bike Selector */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Select Your Bike</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bikes.map(bike => (
              <button
                key={bike.id}
                onClick={() => selectBike(bike)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedBike?.id === bike.id 
                    ? 'border-indigo-400 bg-indigo-900 text-white' 
                    : 'border-gray-600 bg-gray-700 text-gray-200 hover:border-gray-500'
                }`}
              >
                <h3 className="font-semibold">{bike.nickname}</h3>
                <p className="text-gray-400 text-sm">{bike.brand} {bike.model}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cadence Input */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Cadence</h2>
          <div className="flex items-center gap-4">
            <label className="text-gray-200">RPM:</label>
            <input
              type="number"
              value={cadence}
              onChange={(e) => {
                setCadence(parseInt(e.target.value) || 90)
                if (currentSetup.crankset) calculateGears(currentSetup, 'current')
                if (proposedSetup.crankset) calculateGears(proposedSetup, 'proposed')
              }}
              className="border border-gray-600 bg-gray-700 text-white rounded px-3 py-2 w-20"
              min="50"
              max="150"
            />
          </div>
        </div>

        {/* Two-Card Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Current Setup Card */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Current Setup</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Crankset</label>
                <div className="p-3 bg-gray-700 rounded">
                  {currentSetup.crankset ? (
                    <div>
                      <p className="font-medium text-white">{currentSetup.crankset.brand} {currentSetup.crankset.model}</p>
                      <p className="text-sm text-gray-300">{currentSetup.crankset.chainrings}T</p>
                    </div>
                  ) : (
                    <p className="text-gray-400">No crankset found</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Cassette</label>
                <div className="p-3 bg-gray-700 rounded">
                  {currentSetup.cassette ? (
                    <div>
                      <p className="font-medium text-white">{currentSetup.cassette.brand} {currentSetup.cassette.model}</p>
                      <p className="text-sm text-gray-300">{currentSetup.cassette.cogs}T</p>
                    </div>
                  ) : (
                    <p className="text-gray-400">No cassette found</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Wheelset</label>
                <div className="p-3 bg-gray-700 rounded">
                  {currentSetup.wheelset ? (
                    <div>
                      <p className="font-medium text-white">{currentSetup.wheelset.brand} {currentSetup.wheelset.model}</p>
                      <p className="text-sm text-gray-300">{currentSetup.wheelset.circumference_mm}mm</p>
                    </div>
                  ) : (
                    <p className="text-gray-400">No wheelset found</p>
                  )}
                </div>
              </div>
            </div>

            {currentGears.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-white">Gear Ratios</h3>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-1 text-gray-200">Gear</th>
                        <th className="text-left py-1 text-gray-200">Ratio</th>
                        <th className="text-left py-1 text-gray-200">Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentGears.map((gear) => (
                        <tr key={gear.gear} className="border-b border-gray-700">
                          <td className="py-1 text-gray-200">{gear.chainring}T/{gear.cog}T</td>
                          <td className="py-1 text-gray-200">{gear.ratio.toFixed(2)}</td>
                          <td className="py-1 text-gray-200">{gear.speedKph.toFixed(1)} km/h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Proposed Setup Card */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Proposed Setup</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Crankset</label>
                <select
                  value={proposedSetup.crankset?.id || ''}
                  onChange={(e) => updateProposedComponent('crankset', e.target.value)}
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2"
                >
                  <option value="">Select a crankset...</option>
                  {availableComponents.cranksets.map(crankset => (
                    <option key={crankset.id} value={crankset.id}>
                      {crankset.brand} {crankset.model} ({crankset.chainrings}T)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Cassette</label>
                <select
                  value={proposedSetup.cassette?.id || ''}
                  onChange={(e) => updateProposedComponent('cassette', e.target.value)}
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2"
                >
                  <option value="">Select a cassette...</option>
                  {availableComponents.cassettes.map(cassette => (
                    <option key={cassette.id} value={cassette.id}>
                      {cassette.brand} {cassette.model} ({cassette.cogs}T)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Wheelset</label>
                <select
                  value={proposedSetup.wheelset?.id || ''}
                  onChange={(e) => updateProposedComponent('wheelset', e.target.value)}
                  className="w-full border border-gray-600 bg-gray-700 text-white rounded px-3 py-2"
                >
                  <option value="">Select a wheelset...</option>
                  {availableComponents.wheelsets.map(wheelset => (
                    <option key={wheelset.id} value={wheelset.id}>
                      {wheelset.brand} {wheelset.model} ({wheelset.circumference_mm}mm)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {proposedGears.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-white">Gear Ratios</h3>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-1 text-gray-200">Gear</th>
                        <th className="text-left py-1 text-gray-200">Ratio</th>
                        <th className="text-left py-1 text-gray-200">Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposedGears.map((gear) => (
                        <tr key={gear.gear} className="border-b border-gray-700">
                          <td className="py-1 text-gray-200">{gear.chainring}T/{gear.cog}T</td>
                          <td className="py-1 text-gray-200">{gear.ratio.toFixed(2)}</td>
                          <td className="py-1 text-gray-200">{gear.speedKph.toFixed(1)} km/h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comparison Results */}
        {(() => {
          const comparison = getGearComparison()
          if (!comparison) return null

          return (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Comparison</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800">Climbing Gear</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {comparison.easierClimbing > 0 ? '+' : ''}{comparison.easierClimbing.toFixed(1)}%
                  </p>
                  <p className="text-sm text-green-700">
                    {comparison.easierClimbing > 0 ? 'Easier' : 'Harder'} climbing gear
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800">Top-End Speed</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {comparison.fasterTopEnd > 0 ? '+' : ''}{comparison.fasterTopEnd.toFixed(1)}%
                  </p>
                  <p className="text-sm text-blue-700">
                    {comparison.fasterTopEnd > 0 ? 'Faster' : 'Slower'} top-end gear
                  </p>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}