// File: cranksmith-app/src/app/calculators/compatibility/page.tsx
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
  component_categories: {
    name: string
  } | null
}

interface Standard {
  id: string
  name: string
  category: string
  display_name: string
  description: string
}

interface CompatibilityResult {
  compatible: boolean
  compatibility_type: 'direct' | 'adapter' | 'incompatible'
  adapter_component?: Component
  notes?: string
}

export default function CompatibilityChecker() {
  const [, setUser] = useState<User | null>(null)
  const [, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [components, setComponents] = useState<Component[]>([])
  const [, ] = useState<Standard[]>([])
  
  // Form state
  const [selectedComponent1, setSelectedComponent1] = useState<string>('')
  const [selectedComponent2, setSelectedComponent2] = useState<string>('')
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
    // Fetch components from the products table (which is the correct table)
    const { data: componentsData, error } = await supabase
      .from('products')
      .select(`
        id,
        brand,
        model,
        description,
        product_type
      `)
      .order('brand', { ascending: true })

    if (error) {
      console.error('Error fetching components:', error)
      return
    }

    // Transform the data to match our interface (use product_type as category)
    const transformedComponents: Component[] = (componentsData || []).map((comp: any) => ({
      id: comp.id,
      brand: comp.brand,
      model: comp.model,
      description: comp.description,
      component_categories: comp.product_type ? { name: comp.product_type } : null
    }))

    setComponents(transformedComponents)
  }

  const checkCompatibility = async () => {
    if (!selectedComponent1 || !selectedComponent2) {
      return
    }

    setChecking(true)
    setResult(null)

    try {
      // Get standards for both components (using product_standards table)
      const { data: standards1, error: error1 } = await supabase
        .from('product_standards')
        .select(`
          standards (
            id,
            name,
            category,
            display_name,
            description
          )
        `)
        .eq('product_id', selectedComponent1)

      const { data: standards2, error: error2 } = await supabase
        .from('product_standards')
        .select(`
          standards (
            id,
            name,
            category,
            display_name,
            description
          )
        `)
        .eq('product_id', selectedComponent2)

      if (error1 || error2) {
        console.error('Error fetching component standards:', error1 || error2)
        setResult({
          compatible: false,
          compatibility_type: 'incompatible',
          notes: 'Error checking compatibility - products may not have standards defined yet.'
        })
        setChecking(false)
        return
      }

      // Extract the actual standards objects from the nested structure
      const standards1List = standards1?.map((s: any) => s.standards).filter(Boolean) || []
      const standards2List = standards2?.map((s: any) => s.standards).filter(Boolean) || []

      let compatibilityFound = false

      // Check each standard from component 1 against each standard from component 2
      for (const std1 of standards1List) {
        for (const std2 of standards2List) {
          // Only check standards in the same category
          if (std1.category === std2.category) {
            // Check compatibility rules
            const { data: rules, error: rulesError } = await supabase
              .from('compatibility_rules')
              .select(`
                compatibility_type,
                notes,
                adapter_component_id
              `)
              .or(`and(standard_a_id.eq.${std1.id},standard_b_id.eq.${std2.id}),and(standard_a_id.eq.${std2.id},standard_b_id.eq.${std1.id})`)

            if (rulesError) {
              console.error('Error checking compatibility rules:', rulesError)
              continue
            }

            if (rules && rules.length > 0) {
              const rule = rules[0]
              
              // If there's an adapter component, fetch it separately
              let adapterComponent: Component | undefined = undefined
              if (rule.adapter_component_id) {
                const { data: adapterData, error: adapterError } = await supabase
                  .from('products')
                  .select(`
                    id,
                    brand,
                    model,
                    description,
                    product_type
                  `)
                  .eq('id', rule.adapter_component_id)
                  .single()
                
                if (!adapterError && adapterData) {
                  adapterComponent = {
                    id: adapterData.id,
                    brand: adapterData.brand,
                    model: adapterData.model,
                    description: adapterData.description,
                    component_categories: adapterData.product_type ? { name: adapterData.product_type } : null
                  }
                }
              }
              
              setResult({
                compatible: rule.compatibility_type !== 'incompatible',
                compatibility_type: rule.compatibility_type,
                adapter_component: adapterComponent,
                notes: rule.notes
              })
              compatibilityFound = true
              break
            }
          }
        }
        if (compatibilityFound) break
      }

      // If no specific rule found, check if they're the same standard (direct compatibility)
      if (!compatibilityFound) {
        const sameStandards = standards1List.some(std1 => 
          standards2List.some(std2 => std1.id === std2.id)
        )

        if (sameStandards) {
          setResult({
            compatible: true,
            compatibility_type: 'direct',
            notes: 'These components use the same standard and are directly compatible.'
          })
        } else {
          setResult({
            compatible: false,
            compatibility_type: 'incompatible',
            notes: 'No compatibility information available for these products. They may require further research or custom solutions.'
          })
        }
      }

    } catch (error) {
      console.error('Error checking compatibility:', error)
      setResult({
        compatible: false,
        compatibility_type: 'incompatible',
        notes: 'Error occurred while checking compatibility.'
      })
    }

    setChecking(false)
  }

  // const getResultColor = (type: string) => {
  //   switch (type) {
  //     case 'direct': return 'green'
  //     case 'adapter': return 'yellow'
  //     case 'incompatible': return 'red'
  //     default: return 'gray'
  //   }
  // }

  const getResultMessage = (type: string) => {
    switch (type) {
      case 'direct': return 'Direct Fit ✅'
      case 'adapter': return 'Compatible with Adapter ⚠️'
      case 'incompatible': return 'Not Compatible ❌'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compatibility checker...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Parts Compatibility Checker</h1>
          <p className="text-gray-600">
            Check if two components will work together on your bike
          </p>
        </div>

        {/* Main Compatibility Checker */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Component 1 Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I have this component:
              </label>
              <select
                value={selectedComponent1}
                onChange={(e) => setSelectedComponent1(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a component...</option>
                {components.map((component) => (
                  <option key={component.id} value={component.id}>
                    {component.brand} {component.model} ({component.component_categories?.name || 'Unknown Category'})
                  </option>
                ))}
              </select>
            </div>

            {/* Component 2 Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I want to install this:
              </label>
              <select
                value={selectedComponent2}
                onChange={(e) => setSelectedComponent2(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a component...</option>
                {components.map((component) => (
                  <option key={component.id} value={component.id}>
                    {component.brand} {component.model} ({component.component_categories?.name || 'Unknown Category'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Check Button */}
          <div className="text-center mb-6">
            <button
              onClick={checkCompatibility}
              disabled={!selectedComponent1 || !selectedComponent2 || checking}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                !selectedComponent1 || !selectedComponent2 || checking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {checking ? 'Checking Compatibility...' : 'Check Compatibility'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className={`p-4 rounded-lg border-2 ${
              result.compatibility_type === 'direct' ? 'bg-green-50 border-green-200' :
              result.compatibility_type === 'adapter' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="text-center mb-4">
                <h3 className={`text-lg font-semibold ${
                  result.compatibility_type === 'direct' ? 'text-green-800' :
                  result.compatibility_type === 'adapter' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {getResultMessage(result.compatibility_type)}
                </h3>
              </div>

              {result.notes && (
                <p className={`text-sm mb-4 ${
                  result.compatibility_type === 'direct' ? 'text-green-700' :
                  result.compatibility_type === 'adapter' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {result.notes}
                </p>
              )}

              {result.adapter_component && (
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-gray-900 mb-1">Required Adapter:</p>
                  <p className="text-gray-700">
                    {result.adapter_component.brand} {result.adapter_component.model}
                  </p>
                  {result.adapter_component.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {result.adapter_component.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-indigo-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2">
            How It Works
          </h2>
          <p className="text-indigo-700 mb-4">
            This tool checks compatibility between bike components by analyzing their technical standards 
            (like bottom bracket types, brake mount standards, hub spacing, etc.).
          </p>
          <div className="space-y-2 text-sm text-indigo-700">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✅</span>
              <span><strong>Direct Fit:</strong> Components work together without modifications</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <span><strong>Adapter Needed:</strong> Components can work with an additional adapter</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-600 mr-2">❌</span>
              <span><strong>Incompatible:</strong> Components cannot work together</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}