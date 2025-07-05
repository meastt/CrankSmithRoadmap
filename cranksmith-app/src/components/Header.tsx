// File: cranksmith-app/src/components/Header.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  subscription_status: string
}

interface HeaderProps {
  pageTitle: string
  pageSubtitle?: string
  backTo?: {
    href: string
    label: string
  }
}

export default function Header({ pageTitle, pageSubtitle, backTo }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setProfile(profileData)
      }
    }

    fetchUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="header-dark sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top row - Logo and user info */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/garage"
            className="flex items-center space-x-3 group"
          >
            <div className="text-4xl filter drop-shadow-lg">🚴</div>
            <span className="text-2xl font-bold logo-text transition-all duration-200 drop-shadow-lg" style={{ color: 'var(--foreground)' }}>
              CrankSmith
            </span>
          </Link>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{user.email}</span>
                {profile?.subscription_status === 'premium' && (
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-semibold rounded-full shadow-lg">
                    Premium
                  </span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-300 hover:text-orange-500 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Navigation Bar - Bold dark theme */}
        {user && (
          <div className="flex items-center space-x-8 pb-4">
            <Link 
              href="/garage"
              className={`text-sm font-semibold transition-all duration-200 pb-2 ${
                pathname === '/garage'
                  ? 'text-orange-500 border-b-2 border-orange-500 drop-shadow-lg' 
                  : 'text-slate-300 hover:text-slate-100'
              }`}
            >
              Garage
            </Link>
            <Link 
              href="/calculators"
              className={`text-sm font-semibold transition-all duration-200 pb-2 ${
                pathname.includes('/calculators')
                  ? 'text-orange-500 border-b-2 border-orange-500 drop-shadow-lg' 
                  : 'text-slate-300 hover:text-slate-100'
              }`}
            >
              Tools & Calculators
            </Link>
            {/* Future navigation items */}
            <span className="text-sm text-slate-500 font-medium">Community (Coming Soon)</span>
          </div>
        )}

        {/* Bottom row - Page title and breadcrumb */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center space-x-4">
            {backTo && (
              <Link 
                href={backTo.href}
                className="text-sm text-orange-500 hover:text-orange-400 transition-colors flex items-center font-medium"
              >
                ← {backTo.label}
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{pageTitle}</h1>
              {pageSubtitle && (
                <p className="text-sm text-slate-300 mt-1">{pageSubtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}