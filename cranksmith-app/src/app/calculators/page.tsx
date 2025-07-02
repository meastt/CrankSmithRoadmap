// src/app/calculators/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'

export default function CalculatorsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Calculators
          </h1>
          <p className="text-gray-600">
            Pre-ride optimization tools to get your bike dialed in perfectly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tire Pressure Calculator */}
          <Link href="/calculators/tire-pressure" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <div className="text-2xl">🚴‍♂️</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Tire Pressure Calculator
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    Get optimal tire pressure recommendations based on your weight, tire specs, and riding conditions.
                  </p>
                  
                  {/* Feature badges */}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Free Version
                    </span>
                    {profile?.subscription_status === 'premium' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Premium Features
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Suspension Setup Calculator */}
          <Link href="/calculators/suspension" className="group">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <div className="text-2xl">🏔️</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    Suspension Setup Guide
                  </h3>
                  <p className="text-gray-600 mt-1 mb-3">
                    Get baseline suspension settings for your MTB fork and shock based on manufacturer recommendations.
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Free Version
                    </span>
                    {profile?.subscription_status === 'premium' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Premium Features
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Future calculators placeholders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50">
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <div className="text-2xl">⚙️</div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Chain Length Calculator
                  <span className="ml-2 text-sm text-gray-500">(Future)</span>
                </h3>
                <p className="text-gray-600 mt-1">
                  Calculate optimal chain length for your drivetrain setup.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50">
            <div className="flex items-start space-x-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <div className="text-2xl">🎯</div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Spoke Tension Calculator
                  <span className="ml-2 text-sm text-gray-500">(Future)</span>
                </h3>
                <p className="text-gray-600 mt-1">
                  Calculate proper spoke tension for wheel builds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="mt-12 bg-indigo-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2">
            About These Calculators
          </h2>
          <p className="text-indigo-700 mb-4">
            These tools help you optimize your bike setup before every ride. Free users get access to basic calculators, 
            while premium subscribers get advanced features that use your exact bike components for more accurate results.
          </p>
          
          {profile?.subscription_status !== 'premium' && (
            <div className="bg-white p-4 rounded-lg border border-indigo-200">
              <h3 className="font-medium text-indigo-900 mb-2">
                Unlock Premium Calculator Features
              </h3>
              <ul className="text-sm text-indigo-700 space-y-1 mb-3">
                <li>• Auto-fill from your garage bikes</li>
                <li>• Advanced tire and rim compatibility data</li>
                <li>• Surface-specific recommendations</li>
                <li>• Suspension setup guides (MTB)</li>
              </ul>
              <Link href="/upgrade" className="text-indigo-600 font-medium hover:text-indigo-700">
                Upgrade to Premium →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}