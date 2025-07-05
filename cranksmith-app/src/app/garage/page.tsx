// File: cranksmith-app/src/app/garage/page.tsx
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
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
                <div className="text-3xl mr-4 filter drop-shadow-lg">🚴‍♂️</div>
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
                <div className="text-3xl mr-4 filter drop-shadow-lg">🔧</div>
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
                <div className="text-3xl mr-4 filter drop-shadow-lg">📊</div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>0 miles</p>
                  <p style={{ color: 'var(--muted)' }}>Total Miles</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tools & Calculators Section */}
        <div className="bg-slate-700 rounded-lg border border-slate-600 shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="text-2xl mr-3 filter drop-shadow-lg">🛠</div>
            <h2 className="text-xl font-semibold text-slate-100">Tools & Calculators</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link 
              href="/calculators/gear-ratio"
              className="group p-4 bg-slate-600 border border-slate-500 rounded-lg hover:border-orange-500 hover:shadow-lg hover:bg-slate-500 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3 filter drop-shadow-lg">⚙️</div>
                <h3 className="font-semibold text-slate-100 group-hover:text-orange-400 transition-colors">
                  Gear Ratio Calculator
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Compare current vs proposed setups
                </p>
              </div>
            </Link>

            <Link 
              href="/calculators/compatibility"
              className="group p-4 bg-gradient-to-br from-orange-600 to-orange-700 border border-orange-500 rounded-lg hover:from-orange-500 hover:to-orange-600 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="text-center">
                <div className="text-3xl mb-3 filter drop-shadow-lg">🔍</div>
                <h3 className="font-semibold text-white transition-colors">
                  Parts Compatibility
                </h3>
                <p className="text-sm text-orange-100 mt-1">
                  Check if parts work together
                </p>
              </div>
            </Link>

            <Link 
              href="/calculators/tire-pressure"
              className="group p-4 bg-slate-600 border border-slate-500 rounded-lg hover:border-orange-500 hover:shadow-lg hover:bg-slate-500 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3 filter drop-shadow-lg">🔴</div>
                <h3 className="font-semibold text-slate-100 group-hover:text-orange-400 transition-colors">
                  Tire Pressure
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Calculate optimal pressure
                </p>
              </div>
            </Link>

            <Link 
              href="/calculators/suspension"
              className="group p-4 bg-slate-600 border border-slate-500 rounded-lg hover:border-orange-500 hover:shadow-lg hover:bg-slate-500 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3 filter drop-shadow-lg">🔧</div>
                <h3 className="font-semibold text-slate-100 group-hover:text-orange-400 transition-colors">
                  Suspension Setup
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Calculate suspension settings
                </p>
              </div>
            </Link>

            <Link 
              href="/calculators/chain-length"
              className="group p-4 bg-slate-600 border border-slate-500 rounded-lg hover:border-orange-500 hover:shadow-lg hover:bg-slate-500 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3 filter drop-shadow-lg">🔗</div>
                <h3 className="font-semibold text-slate-100 group-hover:text-orange-400 transition-colors">
                  Chain Length
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Calculate optimal chain length
                </p>
              </div>
            </Link>

            <Link 
              href="/calculators/spoke-tension"
              className="group p-4 bg-slate-600 border border-slate-500 rounded-lg hover:border-orange-500 hover:shadow-lg hover:bg-slate-500 transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-3 filter drop-shadow-lg">🎯</div>
                <h3 className="font-semibold text-slate-100 group-hover:text-orange-400 transition-colors">
                  Spoke Tension
                </h3>
                <p className="text-sm text-slate-300 mt-1">
                  Calculate proper spoke tension
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Your Bikes Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Your Bikes</h2>
          <button
            onClick={handleAddBikeClick}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Add Bike
          </button>
        </div>

        {bikes.length === 0 ? (
          <div className="bg-slate-700 rounded-lg border border-slate-600 shadow-lg">
            <div className="p-12 text-center">
              <div className="text-6xl mb-4 filter drop-shadow-lg">🚴‍♂️</div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                No bikes yet
              </h3>
              <p className="text-slate-300 mb-6">
                Add your first bike to start building your digital garage.
              </p>
              <button
                onClick={handleAddBikeClick}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Add Your First Bike
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map((bike) => (
              <Link 
                key={bike.id} 
                href={`/garage/bike/${bike.id}`}
                className="group block"
              >
                <div className="bg-slate-700 rounded-lg border border-slate-600 shadow-lg hover:shadow-xl hover:border-orange-500 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl filter drop-shadow-lg">🚴‍♂️</div>
                      <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded-full border border-slate-500">
                        {bike.bike_type}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-100 group-hover:text-orange-400 transition-colors mb-1">
                      {bike.nickname}
                    </h3>
                    <p className="text-slate-300 text-sm mb-2">
                      {bike.brand} {bike.model}
                    </p>
                    <p className="text-xs text-slate-400">
                      Added {new Date(bike.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-700 border border-slate-600 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Upgrade to Premium</h3>
            <p className="text-slate-300 mb-4">
              Free accounts are limited to 1 bike. Upgrade to Premium for unlimited bikes and advanced features.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/upgrade')}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-4 py-2 rounded-lg font-semibold flex-1 transition-all duration-200 shadow-lg"
              >
                Upgrade Now
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="bg-slate-600 hover:bg-slate-500 text-slate-100 px-4 py-2 rounded-lg font-semibold flex-1 transition-colors border border-slate-500"
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