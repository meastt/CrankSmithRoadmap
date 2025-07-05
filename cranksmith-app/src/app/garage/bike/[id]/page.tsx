// src/app/garage/bike/[id]/page.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

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

interface Profile {
  id: string
  subscription_status: 'free' | 'premium'
}

interface GroupedComponents {
  [categoryName: string]: BikeComponent[]
}

export default function BikeDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [bike, setBike] = useState<Bike | null>(null)
  const [bikeComponents, setBikeComponents] = useState<BikeComponent[]>([])
  const [groupedComponents, setGroupedComponents] = useState<GroupedComponents>({})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<any>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
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

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // Fetch bike details
      const { data: bikeData, error: bikeError } = await supabase
        .from('bikes')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('user_id', user.id)
        .single()

      if (bikeError || !bikeData) {
        setError('Bike not found')
        setLoading(false)
        return
      }

      setBike(bikeData)

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
            component_categories (
              name
            )
          )
        `)
        .eq('bike_id', resolvedParams.id)

      if (!componentsError && componentsData) {
        setBikeComponents(componentsData)
        
        // Group components by category
        const grouped = componentsData.reduce((acc: GroupedComponents, bikeComp) => {
          const categoryName = bikeComp.components?.component_categories?.name || 'Other'
          if (!acc[categoryName]) {
            acc[categoryName] = []
          }
          acc[categoryName].push(bikeComp)
          return acc
        }, {})
        
        setGroupedComponents(grouped)
      }

      setLoading(false)
    }

    fetchBikeDetails()
  }, [resolvedParams.id, router])

  // Calculate total weight (Premium feature)
  const calculateTotalWeight = () => {
    if (profile?.subscription_status !== 'premium') {
      return null
    }
    
    return bikeComponents.reduce((total, bikeComp) => {
      const weight = bikeComp.actual_weight_grams || bikeComp.components?.weight_grams || 0
      return total + weight
    }, 0)
  }

  const totalWeight = calculateTotalWeight()

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <Header pageTitle="Loading..." />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !bike) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
        <Header pageTitle="Error" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-muted" style={{ color: 'var(--muted)' }}>
              {error || 'Bike not found'}
            </p>
            <Link 
              href="/garage"
              className="btn-primary mt-4"
            >
              Back to Garage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Header 
        pageTitle={bike.nickname}
        pageSubtitle={`${bike.brand} ${bike.model} • ${bike.bike_type}`}
        backTo={{
          href: '/garage',
          label: 'Back to Garage'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bike Overview Card */}
        <div className="card mb-8">
          <div className="card-content">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                  {bike.nickname}
                </h2>
                <p className="text-muted" style={{ color: 'var(--muted)' }}>
                  {bike.brand} {bike.model}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-light)' }}>
                  {bike.bike_type} • Added {new Date(bike.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Weight Display (Premium Feature) */}
                {profile?.subscription_status === 'premium' && totalWeight ? (
                  <div className="text-right">
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Total Weight</p>
                    <p className="text-2xl font-bold text-primary" style={{ color: 'var(--primary)' }}>
                      {(totalWeight / 1000).toFixed(1)}kg
                    </p>
                  </div>
                ) : profile?.subscription_status === 'free' && (
                  <div 
                    className="text-right cursor-pointer p-3 border-2 border-dashed rounded-lg hover:border-primary transition-colors"
                    style={{ 
                      borderColor: 'var(--primary)',
                      opacity: 0.7,
                    }}
                    onClick={() => setShowUpgradeModal(true)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)'
                      e.currentTarget.style.opacity = '0.7'
                    }}
                  >
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>Total Weight</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>Upgrade</p>
                  </div>
                )}
                
                <Link
                  href={`/garage/bike/${bike.id}/add-component`}
                  className="btn-primary"
                >
                  Add Component
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Components Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Components
            </h3>
          </div>
          <div className="card-content">
            {Object.keys(groupedComponents).length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔧</div>
                <h4 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  No components added yet
                </h4>
                <p className="mb-6" style={{ color: 'var(--muted)' }}>
                  Start building your bike&apos;s spec sheet by adding components.
                </p>
                <Link
                  href={`/garage/bike/${bike.id}/add-component`}
                  className="btn-primary"
                >
                  Add First Component
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedComponents)
                  .sort(([a], [b]) => a.localeCompare(b)) // Sort categories alphabetically
                  .map(([categoryName, components]) => (
                  <div key={categoryName} className="border-b last:border-b-0 pb-6 last:pb-0" 
                       style={{ borderColor: 'var(--border)' }}>
                    <h4 className="category-header text-lg font-semibold mb-3" 
                        style={{ color: 'var(--foreground)' }}>
                      {categoryName}
                    </h4>
                    <div className="space-y-3">
                      {components.map((bikeComp) => (
                        <div key={bikeComp.id} className="component-card p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium" style={{ color: 'var(--foreground)' }}>
                                {bikeComp.components?.brand} {bikeComp.components?.model}
                              </h5>
                              {bikeComp.components?.description && (
                                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                                  {bikeComp.components.description}
                                </p>
                              )}
                              
                              {/* Mileage info for Premium users */}
                              {profile?.subscription_status === 'premium' && bikeComp.mileage_miles > 0 && (
                                <p className="text-sm mt-1" style={{ color: 'var(--muted-light)' }}>
                                  {bikeComp.mileage_miles} miles
                                </p>
                              )}
                            </div>
                            
                            <div className="text-right">
                              {/* Weight info */}
                              {(bikeComp.actual_weight_grams || bikeComp.components?.weight_grams) && (
                                <p className="text-sm font-medium" style={{ color: 'var(--secondary)' }}>
                                  {bikeComp.actual_weight_grams || bikeComp.components?.weight_grams}g
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--surface)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Upgrade to Premium
            </h3>
            <p className="mb-4" style={{ color: 'var(--muted)' }}>
              Get access to weight tracking, mileage logging, and advanced calculators.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/upgrade')}
                className="btn-primary flex-1"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="btn-secondary flex-1"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}