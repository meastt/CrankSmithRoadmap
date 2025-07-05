// src/components/Header.tsx - Navigation Fixes
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
    <header className="border-b sticky top-0 z-50" 
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top row - Logo and user info */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/garage"
            className="flex items-center space-x-3 group"
          >
            <div className="text-4xl">🚴</div>
            <span className="text-2xl font-bold transition-colors logo-text" 
                  style={{ color: 'var(--foreground)' }}>
              CrankSmith
            </span>
          </Link>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted" style={{ color: 'var(--muted)' }}>
                  {user.email}
                </span>
                {profile?.subscription_status === 'premium' && (
                  <span className="badge badge-premium">
                    Premium
                  </span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium transition-colors sign-out-btn"
                style={{ color: 'var(--muted)' }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Navigation Bar - Carbon Fiber theme */}
        {user && (
          <div className="flex items-center space-x-8 pb-4">
            <Link 
              href="/garage"
              className={`nav-link text-sm font-semibold pb-2 ${
                pathname === '/garage' ? 'active' : ''
              }`}
            >
              Garage
            </Link>
            <Link 
              href="/calculators"
              className={`nav-link text-sm font-semibold pb-2 ${
                pathname.includes('/calculators') ? 'active' : ''
              }`}
            >
              Tools & Calculators
            </Link>
            {/* Future navigation items */}
            <span className="text-sm font-medium text-muted-light" 
                  style={{ color: 'var(--muted-light)' }}>
              Community (Coming Soon)
            </span>
          </div>
        )}

        {/* Bottom row - Page title and breadcrumb */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center space-x-4">
            {backTo && (
              <Link 
                href={backTo.href}
                className="text-sm font-medium transition-colors hover:opacity-80 flex items-center"
                style={{ color: 'var(--primary)' }}
              >
                ← {backTo.label}
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}