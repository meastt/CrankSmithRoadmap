// src/app/calculators/page.tsx - Updated with Drivetrain Compatibility
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
        pageTitle="Tools & Calculators" 
        pageSubtitle="Pre-ride optimization tools to get your bike dialed in perfectly"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Drivetrain Compatibility Checker - NEW */}
          <Link 
            href="/calculators/drivetrain" 
            className={`component-card group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed opacity-60' : 'hover:border-primary'}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--primary-light)' }}>
                  <div className="text-2xl">🔧</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Drivetrain Compatibility
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    Avoid costly mistakes. Check if your cassette, derailleur, and shifter work together before you buy.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium">
                      Premium Feature
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Gear Ratio Calculator */}
          <Link 
            href="/calculators/gear-ratio" 
            className={`component-card group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed opacity-60' : 'hover:border-primary'}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--primary-light)' }}>
                  <div className="text-2xl">⚙️</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Gear Ratio Calculator
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    Compare current vs proposed gear setups. See gains/losses in ratios, speeds, and climbing gears.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium">
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
            className={`component-card group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed opacity-60' : 'hover:border-primary'}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--success)', opacity: 0.2 }}>
                  <div className="text-2xl">🔍</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    General Parts Compatibility
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    Check any bike parts for compatibility. Bottom brackets, brakes, headsets, and more.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium">
                      Premium Feature
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>

          {/* Tire Pressure Calculator */}
          <Link href="/calculators/tire-pressure" className="component-card group hover:border-primary">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--secondary)', opacity: 0.2 }}>
                  <div className="text-2xl">🛞</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Tire Pressure Calculator
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    Get optimal tire pressure recommendations based on your weight, tire specs, and riding conditions.
                  </p>
                  <span className="badge badge-free">
                    Free Tool
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Suspension Setup Guide */}
          <Link href="/calculators/suspension" className="component-card group hover:border-primary">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--warning)', opacity: 0.2 }}>
                  <div className="text-2xl">🔧</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Suspension Setup Guide
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    MTB suspension baseline settings. Get PSI and click recommendations for your fork/shock.
                  </p>
                  <span className="badge badge-free">
                    Free Tool
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* Chain Length Calculator */}
          <Link 
            href="/calculators/chain-length" 
            className={`component-card group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed opacity-60' : 'hover:border-primary'}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--warning)', opacity: 0.2 }}>
                  <div className="text-2xl">🔗</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Chain Length Calculator
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    Calculate optimal chain length for your drivetrain setup.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium">
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
            className={`component-card group ${profile?.subscription_status !== 'premium' ? 'cursor-not-allowed opacity-60' : 'hover:border-primary'}`}
            onClick={(e) => {
              if (profile?.subscription_status !== 'premium') {
                e.preventDefault()
                setShowUpgradeModal(true)
              }
            }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--error)', opacity: 0.2 }}>
                  <div className="text-2xl">🎯</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                    Spoke Tension Calculator
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    Calculate proper spoke tension for wheel building.
                  </p>
                  {profile?.subscription_status !== 'premium' && (
                    <span className="badge badge-premium">
                      Premium Feature
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
          
        </div>

        {/* Info Section - Updated */}
        <div className="mt-12 bg-indigo-50 rounded-lg p-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
            About These Tools
          </h2>
          <p className="mb-4" style={{ color: 'var(--muted)' }}>
            These calculators help you optimize your bike setup and avoid compatibility mistakes. 
            Free users get access to basic tools, while premium subscribers get advanced features with component database integration.
          </p>
          
          {profile?.subscription_status !== 'premium' && (
            <div className="p-4 rounded-lg border" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
              <h3 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                Unlock Premium Calculator Features
              </h3>
              <ul className="text-sm space-y-1 mb-3" style={{ color: 'var(--muted)' }}>
                <li>• Drivetrain compatibility checking (avoid expensive mistakes)</li>
                <li>• Auto-fill from your garage bikes</li>
                <li>• Advanced component database with technical specs</li>
                <li>• Gear ratio comparisons and analysis</li>
              </ul>
              <Link href="/upgrade" className="text-indigo-600 font-medium hover:text-indigo-700">
                Upgrade to Premium →
              </Link>
            </div>
          )}
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
              Get access to advanced calculators including drivetrain compatibility checking, unlimited bikes, and component tracking.
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