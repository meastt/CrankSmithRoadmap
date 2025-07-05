// src/app/calculators/page.tsx - Proper Tools Overview
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'

interface User {
  id: string
  email?: string
}

interface Profile {
  id: string
  subscription_status?: 'free' | 'premium'
}

export default function CalculatorsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
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
      setLoading(false)
    }

    fetchData()
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user || undefined} profile={profile || undefined} />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tools & Calculators
          </h1>
          <p className="text-gray-600">
            Pre-ride optimization tools to get your bike dialed in perfectly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Gear Ratio Calculator */}
          <Link 
            href="/calculators/gear-ratio" 
            className={`group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed' : ''}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
              profile?.subscription_status !== 'premium' ? 'opacity-75' : ''
            }`}>
              <div className="flex items-start space-x-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <div className="text-2xl">⚙️</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Gear Ratio Calculator
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    Compare current vs proposed gear setups. See gains/losses in ratios, speeds, and climbing gears.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Premium Feature
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Parts Compatibility Checker */}
          <Link 
            href="/calculators/compatibility" 
            className={`group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed' : ''}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
              profile?.subscription_status !== 'premium' ? 'opacity-75' : ''
            }`}>
              <div className="flex items-start space-x-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <div className="text-2xl">🔍</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Parts Compatibility
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    PC Part Picker for bikes. Check if your parts play nice together before you buy.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Premium Feature
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Tire Pressure Calculator */}
          <Link href="/calculators/tire-pressure" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <div className="text-2xl">🛞</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Tire Pressure Calculator
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    Get optimal tire pressure recommendations based on your weight, tire specs, and riding conditions.
                  </p>
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Free Tool
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Suspension Setup Guide */}
          <Link href="/calculators/suspension" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <div className="text-2xl">🔧</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Suspension Setup Guide
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    MTB suspension baseline settings. Get PSI and click recommendations for your fork/shock.
                  </p>
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Free Tool
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Chain Length Calculator */}
          <Link 
            href="/calculators/chain-length" 
            className={`group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed' : ''}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
              profile?.subscription_status !== 'premium' ? 'opacity-75' : ''
            }`}>
              <div className="flex items-start space-x-4">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <div className="text-2xl">🔗</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Chain Length Calculator
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    Calculate optimal chain length for your drivetrain setup.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Premium Feature
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Spoke Tension Calculator */}
          <Link 
            href="/calculators/spoke-tension" 
            className={`group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed' : ''}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${
              profile?.subscription_status !== 'premium' ? 'opacity-75' : ''
            }`}>
              <div className="flex items-start space-x-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <div className="text-2xl">🎯</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Spoke Tension Calculator
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    Calculate proper spoke tension for wheel building.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                      Premium Feature
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>

        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Premium Feature
                </h3>
                <p className="text-gray-600 mb-6">
                  This calculator is available with Premium. Upgrade to access all advanced tools!
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Premium Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✅ Gear ratio calculator</li>
                    <li>✅ Parts compatibility checker</li>
                    <li>✅ Chain length calculator</li>
                    <li>✅ Spoke tension calculator</li>
                    <li>✅ Enhanced garage features</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Maybe Later
                  </button>
                  <Link
                    href="/upgrade"
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors text-center"
                    onClick={() => setShowUpgradeModal(false)}
                  >
                    Upgrade Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}