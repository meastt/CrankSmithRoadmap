// src/app/garage/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  subscription_status: 'free' | 'premium'
}

interface Bike {
  id: string
  nickname: string
  brand: string
  model: string
  bike_type: string
  created_at: string
}

export default function Garage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchGarageData = async () => {
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

      // Fetch bikes
      const { data: bikesData } = await supabase
        .from('bikes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setBikes(bikesData || [])
      setLoading(false)
    }

    fetchGarageData()
  }, [router])

  const handleAddBikeClick = () => {
    // Free users can only have 1 bike
    if (profile?.subscription_status === 'free' && bikes.length >= 1) {
      setShowUpgradeModal(true)
    } else {
      router.push('/garage/add-bike')
    }
  }

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <Header 
        pageTitle="Your Digital Garage" 
        pageSubtitle="Manage your bikes and components"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🚴‍♂️</div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                    {bikes.length}
                  </p>
                  <p style={{ color: 'var(--muted)' }}>Bikes</p>
                  {profile?.subscription_status === 'free' && (
                    <p className="text-xs" style={{ color: 'var(--muted-light)' }}>
                      Free: 1 bike limit
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="text-3xl mr-4">🔧</div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>0</p>
                  <p style={{ color: 'var(--muted)' }}>Components</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="text-3xl mr-4">📏</div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>0 miles</p>
                  <p style={{ color: 'var(--muted)' }}>Total Miles</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="card mb-8">
          <div className="card-header">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              🔧 Tools & Calculators
            </h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Gear Ratio Calculator - Premium */}
              <Link
                href="/calculators/gear-ratio"
                className={`component-card p-4 transition-colors ${
                  profile?.subscription_status === 'premium'
                    ? 'hover:border-primary cursor-pointer'
                    : 'cursor-not-allowed opacity-60'
                }`}
                onClick={(e) => {
                  if (profile?.subscription_status !== 'premium') {
                    e.preventDefault()
                    setShowUpgradeModal(true)
                  }
                }}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">⚙️</div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Gear Ratio Calculator
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Compare current vs proposed setups
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium inline-block mt-2">
                      Premium
                    </span>
                  )}
                </div>
              </Link>

              {/* Parts Compatibility Checker - Premium */}
              <Link
                href="/calculators/compatibility"
                className={`component-card p-4 transition-colors ${
                  profile?.subscription_status === 'premium'
                    ? 'hover:border-primary cursor-pointer'
                    : 'cursor-not-allowed opacity-60'
                }`}
                onClick={(e) => {
                  if (profile?.subscription_status !== 'premium') {
                    e.preventDefault()
                    setShowUpgradeModal(true)
                  }
                }}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Parts Compatibility
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Check if parts work together
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium inline-block mt-2">
                      Premium
                    </span>
                  )}
                </div>
              </Link>

              {/* Tire Pressure Calculator - Free */}
              <Link
                href="/calculators/tire-pressure"
                className="component-card p-4 hover:border-primary transition-colors"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🛞</div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Tire Pressure
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Calculate optimal pressure
                  </p>
                </div>
              </Link>

              {/* Suspension Setup Tool - Free */}
              <Link
                href="/calculators/suspension"
                className="component-card p-4 hover:border-primary transition-colors"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🔧</div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Suspension Setup
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Calculate suspension settings
                  </p>
                </div>
              </Link>

              {/* Chain Length Calculator - Premium */}
              <Link
                href="/calculators/chain-length"
                className={`component-card p-4 transition-colors ${
                  profile?.subscription_status === 'premium'
                    ? 'hover:border-primary cursor-pointer'
                    : 'cursor-not-allowed opacity-60'
                }`}
                onClick={(e) => {
                  if (profile?.subscription_status !== 'premium') {
                    e.preventDefault()
                    setShowUpgradeModal(true)
                  }
                }}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🔗</div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Chain Length
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Calculate optimal chain length
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium inline-block mt-2">
                      Premium
                    </span>
                  )}
                </div>
              </Link>

              {/* Spoke Tension Calculator - Premium */}
              <Link
                href="/calculators/spoke-tension"
                className={`component-card p-4 transition-colors ${
                  profile?.subscription_status === 'premium'
                    ? 'hover:border-primary cursor-pointer'
                    : 'cursor-not-allowed opacity-60'
                }`}
                onClick={(e) => {
                  if (profile?.subscription_status !== 'premium') {
                    e.preventDefault()
                    setShowUpgradeModal(true)
                  }
                }}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Spoke Tension
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Calculate proper spoke tension
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium inline-block mt-2">
                      Premium
                    </span>
                  )}
                </div>
              </Link>
              
            </div>
          </div>
        </div>

        {/* Bikes Section */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Your Bikes
              </h3>
              <button
                onClick={handleAddBikeClick}
                className="btn-primary"
              >
                Add Bike
              </button>
            </div>
          </div>
          <div className="card-content">
            {bikes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚴‍♂️</div>
                <h4 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  No bikes added yet
                </h4>
                <p className="mb-6" style={{ color: 'var(--muted)' }}>
                  Start by adding your first bike to your digital garage.
                </p>
                <button
                  onClick={handleAddBikeClick}
                  className="btn-primary"
                >
                  Add Your First Bike
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bikes.map((bike) => (
                  <Link
                    key={bike.id}
                    href={`/garage/bike/${bike.id}`}
                    className="component-card p-6 hover:border-primary transition-colors"
                  >
                    <div className="text-center">
                      <div className="text-5xl mb-3">🚴‍♂️</div>
                      <h4 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                        {bike.nickname}
                      </h4>
                      <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
                        {bike.brand} {bike.model}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-light)' }}>
                        {bike.bike_type}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg max-w-md w-full p-6" style={{ backgroundColor: 'var(--surface)' }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Upgrade to Premium
            </h3>
            <p className="mb-4" style={{ color: 'var(--muted)' }}>
              Get access to unlimited bikes, advanced calculators, and component tracking.
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