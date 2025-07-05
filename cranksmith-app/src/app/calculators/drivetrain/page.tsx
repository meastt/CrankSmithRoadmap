// File: cranksmith-app/src/app/calculators/drivetrain/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  subscription_status: string
}

interface Component {
  id: string
  brand: string
  model: string
  description: string
  product_type?: string
  cassettes?: CassetteDetails[]
  derailleurs?: DerailleurDetails[]
  shifters?: ShifterDetails[]
}

interface CassetteDetails {
  speeds?: number
  min_cog_teeth?: number
  max_cog_teeth?: number
  freehub_standard?: string
  cogs?: number[]
}

interface DerailleurDetails {
  speeds?: number
  max_cog_capacity?: number
  min_cog_capacity?: number
  pull_ratio?: string
  cage_length?: string
}

interface ShifterDetails {
  speeds?: number
  pull_ratio?: string
}

interface CompatibilityIssue {
  type: 'error' | 'warning' | 'info'
  component: string
  message: string
  solution?: string
}

interface CompatibilityResult {
  compatible: boolean
  issues: CompatibilityIssue[]
  summary: string
}

export default function DrivetrainCompatibilityChecker() {
  const [, setUser] = useState<User | null>(null)
  const [, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Component state
  const [cassettes, setCassettes] = useState<Component[]>([])
  const [derailleurs, setDerailleurs] = useState<Component[]>([])
  const [shifters, setShifters] = useState<Component[]>([])
  
  // Form state
  const [selectedCassette, setSelectedCassette] = useState<string>('')
  const [selectedDerailleur, setSelectedDerailleur] = useState<string>('')
  const [selectedShifter, setSelectedShifter] = useState<string>('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CompatibilityResult | null>(null)
  
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

      // Check if user has premium access
      if (profileData?.subscription_status !== 'premium') {
        router.push('/upgrade')
        return
      }

      await fetchComponents()
      setLoading(false)
    }

    fetchData()
  }, [router])

  const fetchComponents = async () => {
    // First, let's see what product types exist and show them
    const { data: productTypes, error: typesError } = await supabase
      .from('products')
      .select('product_type')
      .neq('product_type', null)

    if (!typesError) {
      const uniqueTypes = [...new Set(productTypes?.map(p => p.product_type) || [])]
      console.log('Available product types:', uniqueTypes)
    }

    // Fetch cassettes (this works)
    const { data: cassetteData, error: cassetteError } = await supabase
      .from('products')
      .select(`
        id, brand, model, description, product_type,
        cassettes (speeds, min_cog_teeth, max_cog_teeth, freehub_standard, cogs)
      `)
      .eq('product_type', 'cassette')
      .order('brand', { ascending: true })

    if (!cassetteError && cassetteData) {
      console.log('Cassette data found:', cassetteData.length, 'items')
      console.log('Sample cassette data:', cassetteData[0]) // Debug: show structure
      // Filter cassettes that have valid cassette data (single object or array)
      const filteredCassettes = cassetteData.filter(c => c.cassettes && (
        Array.isArray(c.cassettes) ? c.cassettes.length > 0 : c.cassettes !== null
      ))
      console.log('Filtered cassettes:', filteredCassettes.length, 'items')
      setCassettes(filteredCassettes)
    }

    // Fetch derailleurs (real data from database)
    const { data: derailleurData, error: derailleurError } = await supabase
      .from('products')
      .select(`
        id, brand, model, description, product_type,
        derailleurs (speeds, max_cog_capacity, min_cog_capacity, pull_ratio, cage_length)
      `)
      .eq('product_type', 'derailleur')
      .order('brand', { ascending: true })

    if (!derailleurError && derailleurData) {
      console.log('Derailleur data found:', derailleurData.length, 'items')
      console.log('Sample derailleur data:', derailleurData[0]) // Debug: show structure
      // Filter derailleurs that have valid derailleur data (single object or array)
      const filteredDerailleurs = derailleurData.filter(d => d.derailleurs && (
        Array.isArray(d.derailleurs) ? d.derailleurs.length > 0 : d.derailleurs !== null
      ))
      console.log('Filtered derailleurs:', filteredDerailleurs.length, 'items')
      setDerailleurs(filteredDerailleurs)
    } else {
      console.error('Error fetching derailleurs:', derailleurError)
    }

    // Fetch shifters (real data from database)
    const { data: shifterData, error: shifterError } = await supabase
      .from('products')
      .select(`
        id, brand, model, description, product_type,
        shifters (speeds, pull_ratio)
      `)
      .eq('product_type', 'shifter')
      .order('brand', { ascending: true })

    if (!shifterError && shifterData) {
      console.log('Shifter data found:', shifterData.length, 'items')
      console.log('Sample shifter data:', shifterData[0]) // Debug: show structure
      // Filter shifters that have valid shifter data (single object or array)
      const filteredShifters = shifterData.filter(s => s.shifters && (
        Array.isArray(s.shifters) ? s.shifters.length > 0 : s.shifters !== null
      ))
      console.log('Filtered shifters:', filteredShifters.length, 'items')
      setShifters(filteredShifters)
    } else {
      console.error('Error fetching shifters:', shifterError)
    }
  }

  const checkDrivetrainCompatibility = async () => {
    if (!selectedCassette || !selectedDerailleur || !selectedShifter) {
      return
    }

    setChecking(true)
    setResult(null)

    try {
      // Get component details
      const cassette = cassettes.find(c => c.id === selectedCassette)
      const derailleur = derailleurs.find(d => d.id === selectedDerailleur)
      const shifter = shifters.find(s => s.id === selectedShifter)

      if (!cassette || !derailleur || !shifter) {
        throw new Error('Component data not found')
      }

      const cassetteDetails = (Array.isArray(cassette.cassettes) ? cassette.cassettes[0] : cassette.cassettes) as CassetteDetails
      const derailleurDetails = (Array.isArray(derailleur.derailleurs) ? derailleur.derailleurs[0] : derailleur.derailleurs) as DerailleurDetails
      const shifterDetails = (Array.isArray(shifter.shifters) ? shifter.shifters[0] : shifter.shifters) as ShifterDetails

      const issues: CompatibilityIssue[] = []

      // Check speed compatibility
      if (cassetteDetails.speeds && derailleurDetails.speeds && shifterDetails.speeds) {
        if (cassetteDetails.speeds !== derailleurDetails.speeds) {
          issues.push({
            type: 'error',
            component: 'Cassette/Derailleur',
            message: `Speed mismatch: ${cassetteDetails.speeds}-speed cassette with ${derailleurDetails.speeds}-speed derailleur`,
            solution: `Use a ${derailleurDetails.speeds}-speed cassette instead`
          })
        }
        
        if (shifterDetails.speeds !== derailleurDetails.speeds) {
          issues.push({
            type: 'error',
            component: 'Shifter/Derailleur', 
            message: `Speed mismatch: ${shifterDetails.speeds}-speed shifter with ${derailleurDetails.speeds}-speed derailleur`,
            solution: `Use a ${derailleurDetails.speeds}-speed shifter instead`
          })
        }
      }

      // Check derailleur capacity
      if (cassetteDetails.max_cog_teeth && derailleurDetails.max_cog_capacity) {
        if (cassetteDetails.max_cog_teeth > derailleurDetails.max_cog_capacity) {
          issues.push({
            type: 'error',
            component: 'Derailleur Capacity',
            message: `Cassette largest cog (${cassetteDetails.max_cog_teeth}t) exceeds derailleur capacity (${derailleurDetails.max_cog_capacity}t)`,
            solution: `Use a derailleur with at least ${cassetteDetails.max_cog_teeth}t capacity, or choose a smaller cassette`
          })
        }
      }

      // Check pull ratio compatibility
      if (shifterDetails.pull_ratio && derailleurDetails.pull_ratio) {
        if (shifterDetails.pull_ratio !== derailleurDetails.pull_ratio) {
          issues.push({
            type: 'error',
            component: 'Pull Ratio',
            message: `Pull ratio mismatch: ${shifterDetails.pull_ratio} shifter with ${derailleurDetails.pull_ratio} derailleur`,
            solution: `Use components from the same brand family or compatible pull ratios`
          })
        }
      }

      // Check freehub compatibility (would need wheel/hub data)
      if (cassetteDetails.freehub_standard) {
        if (cassetteDetails.freehub_standard === 'XD' || cassetteDetails.freehub_standard === 'XDR') {
          issues.push({
            type: 'warning',
            component: 'Freehub',
            message: `This cassette requires ${cassetteDetails.freehub_standard} freehub driver`,
            solution: 'Verify your wheel has the correct freehub or purchase an XD/XDR driver'
          })
        } else if (cassetteDetails.freehub_standard === 'Microspline') {
          issues.push({
            type: 'warning', 
            component: 'Freehub',
            message: 'This cassette requires Shimano Microspline freehub',
            solution: 'Verify your wheel has Microspline freehub or purchase compatible driver'
          })
        }
      }

      // Generate result
      const hasErrors = issues.some(issue => issue.type === 'error')
      const hasWarnings = issues.some(issue => issue.type === 'warning')

      let summary = ''
      if (!hasErrors && !hasWarnings) {
        summary = '✅ All components are compatible!'
      } else if (hasErrors) {
        summary = '❌ Compatibility issues found that will prevent proper function'
      } else {
        summary = '⚠️ Components are compatible but require additional parts/verification'
      }

      setResult({
        compatible: !hasErrors,
        issues,
        summary
      })

    } catch (error) {
      console.error('Error checking drivetrain compatibility:', error)
      setResult({
        compatible: false,
        issues: [{
          type: 'error',
          component: 'System',
          message: 'Error occurred while checking compatibility.'
        }],
        summary: '❌ Unable to check compatibility'
      })
    }

    setChecking(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading drivetrain checker...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Drivetrain Compatibility Checker</h1>
          <p className="text-gray-600">
            Avoid expensive mistakes when upgrading your drivetrain components
          </p>
        </div>

        {/* Main Compatibility Checker */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Cassette Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cassette
              </label>
              <select
                value={selectedCassette}
                onChange={(e) => setSelectedCassette(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select cassette...</option>
                {cassettes.map((component) => {
                  const details = component.cassettes?.[0] as CassetteDetails
                  return (
                    <option key={component.id} value={component.id}>
                      {component.brand} {component.model} 
                      {details?.speeds && ` (${details.speeds}sp)`}
                      {details?.min_cog_teeth && details?.max_cog_teeth && 
                        ` ${details.min_cog_teeth}-${details.max_cog_teeth}t`}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Derailleur Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rear Derailleur
              </label>
              <select
                value={selectedDerailleur}
                onChange={(e) => setSelectedDerailleur(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select derailleur...</option>
                {derailleurs.map((component) => {
                  const details = component.derailleurs?.[0] as DerailleurDetails
                  return (
                    <option key={component.id} value={component.id}>
                      {component.brand} {component.model}
                      {details?.speeds && ` (${details.speeds}sp)`}
                      {details?.max_cog_capacity && ` max ${details.max_cog_capacity}t`}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Shifter Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shifter
              </label>
              <select
                value={selectedShifter}
                onChange={(e) => setSelectedShifter(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select shifter...</option>
                {shifters.map((component) => {
                  const details = component.shifters?.[0] as ShifterDetails
                  return (
                    <option key={component.id} value={component.id}>
                      {component.brand} {component.model}
                      {details?.speeds && ` (${details.speeds}sp)`}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Check Button */}
          <div className="text-center mb-6">
            <button
              onClick={checkDrivetrainCompatibility}
              disabled={!selectedCassette || !selectedDerailleur || !selectedShifter || checking}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                !selectedCassette || !selectedDerailleur || !selectedShifter || checking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {checking ? 'Checking Compatibility...' : 'Check Drivetrain Compatibility'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg border-2 text-center ${
                result.compatible 
                  ? 'bg-green-50 border-green-200' 
                  : result.issues.some(i => i.type === 'error')
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className={`text-lg font-semibold ${
                  result.compatible 
                    ? 'text-green-800' 
                    : result.issues.some(i => i.type === 'error')
                      ? 'text-red-800'
                      : 'text-yellow-800'
                }`}>
                  {result.summary}
                </h3>
              </div>

              {/* Issues List */}
              {result.issues.length > 0 && (
                <div className="space-y-3">
                  {result.issues.map((issue, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      issue.type === 'error' 
                        ? 'bg-red-50 border-red-400' 
                        : issue.type === 'warning'
                          ? 'bg-yellow-50 border-yellow-400'
                          : 'bg-blue-50 border-blue-400'
                    }`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          {issue.type === 'error' && <span className="text-red-500 text-xl">❌</span>}
                          {issue.type === 'warning' && <span className="text-yellow-500 text-xl">⚠️</span>}
                          {issue.type === 'info' && <span className="text-blue-500 text-xl">ℹ️</span>}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${
                            issue.type === 'error' 
                              ? 'text-red-800' 
                              : issue.type === 'warning'
                                ? 'text-yellow-800'
                                : 'text-blue-800'
                          }`}>
                            {issue.component}
                          </p>
                          <p className={`text-sm mt-1 ${
                            issue.type === 'error' 
                              ? 'text-red-700' 
                              : issue.type === 'warning'
                                ? 'text-yellow-700'
                                : 'text-blue-700'
                          }`}>
                            {issue.message}
                          </p>
                          {issue.solution && (
                            <p className={`text-sm mt-2 font-medium ${
                              issue.type === 'error' 
                                ? 'text-red-800' 
                                : issue.type === 'warning'
                                  ? 'text-yellow-800'
                                  : 'text-blue-800'
                            }`}>
                              💡 Solution: {issue.solution}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-indigo-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2">
            What This Checks
          </h2>
          <div className="text-indigo-700 space-y-2">
            <p><strong>Speed Compatibility:</strong> Ensures cassette, derailleur, and shifter all have matching speeds</p>
            <p><strong>Derailleur Capacity:</strong> Verifies the derailleur can handle the cassette's largest cog</p>
            <p><strong>Pull Ratios:</strong> Checks that shifter and derailleur use compatible cable pull ratios</p>
            <p><strong>Freehub Requirements:</strong> Alerts you to special freehub driver requirements (XD, XDR, Microspline)</p>
          </div>
          
          <div className="mt-4 p-4 bg-white rounded border border-indigo-200">
            <p className="text-sm text-indigo-600">
              <strong>Pro Tip:</strong> This tool helps catch the most common drivetrain compatibility issues. 
              For complex builds or mixed groupsets, consult with a professional mechanic.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}