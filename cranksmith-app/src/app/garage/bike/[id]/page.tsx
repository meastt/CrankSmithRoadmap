// src/app/garage/bike/[id]/page.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Bike {
  id: string
  nickname: string
  brand: string
  model: string
  bike_type: string
  created_at: string
}

interface BikeComponent {
  id: string
  actual_weight_grams: number
  mileage_miles: number
  components: {
    brand: string
    model: string
    description: string
    weight_grams: number
    component_categories: {
      name: string
    }
  }
}

export default function BikeDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [bike, setBike] = useState<Bike | null>(null)
  const [bikeComponents, setBikeComponents] = useState<BikeComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const fetchBikeDetails = async () => {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Fetch bike details
      const { data: bikeData, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id) // Make sure user owns this bike
        .single()

      if (error) {
        setError('Bike not found or you do not have permission to view it')
        console.error('Error fetching bike:', error)
      } else {
        setBike(bikeData)
      }

      // Fetch bike components
      const { data: componentsData, error: componentsError } = await supabase
        .from('bike_components')
        .select(`
          id,
          actual_weight_grams,
          mileage_miles,
          components (
            brand,
            model,
            description,
            weight_grams,
            component_categories (name)
          )
        `)
        .eq('bike_id', resolvedParams.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (componentsError) {
        console.error('Error fetching bike components:', componentsError)
      } else {
        setBikeComponents(componentsData || [])
      }
      
      setLoading(false)
    }

    fetchBikeDetails()
  }, [resolvedParams.id, router])

  // Calculate total weight
  const totalWeight = bikeComponents.reduce((total, comp) => {
    // Check if components data exists
    if (!comp?.components) return total
    
    const weight = comp.actual_weight_grams || comp.components?.weight_grams || 0
    return total + weight
  }, 0)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-gray-600">Loading bike details...</p>
        </div>
      </div>
    )
  }

  if (error || !bike) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600 mb-4">{error || 'Bike not found'}</p>
          <Link 
            href="/garage"
            className="text-indigo-600 hover:text-indigo-700"
          >
            ← Back to Garage
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/garage" className="text-2xl font-bold text-gray-900">
              🔧 CrankSmith
            </Link>
            <span className="ml-4 text-sm text-gray-500">{bike.nickname}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link 
            href="/garage"
            className="text-indigo-600 hover:text-indigo-700 text-sm"
          >
            ← Back to Garage
          </Link>
        </div>

        {/* Bike Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <div className="text-6xl mr-6">🚴‍♂️</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {bike.nickname}
                </h1>
                <div className="space-y-1 text-gray-600">
                  {bike.brand && bike.model && (
                    <p className="text-lg">{bike.brand} {bike.model}</p>
                  )}
                  {bike.bike_type && (
                    <p><span className="font-medium">Type:</span> {bike.bike_type}</p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Added:</span> {new Date(bike.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
                Edit Bike
              </button>
              <a
                href={`/garage/bike/${bike.id}/add-component`}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Add Component
              </a>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">🔧</div>
            <p className="text-2xl font-bold text-gray-900">{bikeComponents.length}</p>
            <p className="text-gray-600">Components</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">📏</div>
            <p className="text-2xl font-bold text-gray-900">0 miles</p>
            <p className="text-gray-600">Total Miles</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">⚖️</div>
            <p className="text-2xl font-bold text-gray-900">
              {totalWeight > 0 ? `${(totalWeight / 1000).toFixed(1)} kg` : '-- kg'}
            </p>
            <p className="text-gray-600">Weight</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-2">🔄</div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-gray-600">Services Due</p>
          </div>
        </div>

        {/* Components Section */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Components</h3>
            <a
              href={`/garage/bike/${bike.id}/add-component`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              + Add Component
            </a>
          </div>
          
          <div className="p-6">
            {bikeComponents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔧</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No components added yet
                </h4>
                <p className="text-gray-600 mb-6">
                  Start building your bike's spec sheet by adding components.
                </p>
                <a
                  href={`/garage/bike/${bike.id}/add-component`}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Add First Component
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {bikeComponents.map((bikeComp) => (
                  <div key={bikeComp.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {bikeComp.components?.brand || 'Unknown'} {bikeComp.components?.model || 'Component'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {bikeComp.components?.component_categories?.name || 'Uncategorized'}
                        </p>
                        {bikeComp.components?.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {bikeComp.components.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        {(bikeComp.actual_weight_grams || bikeComp.components?.weight_grams) && (
                          <p className="font-medium">
                            {bikeComp.actual_weight_grams || bikeComp.components?.weight_grams}g
                          </p>
                        )}
                        <p>{bikeComp.mileage_miles || 0} miles</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service History */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Service History</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600">
                Maintenance records and service alerts will appear here
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}