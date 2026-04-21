'use client'
import React, { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useSelector, useDispatch } from 'react-redux'
import {
  updateUserProfile,
  fetchUserProfile,
  fetchProfileStats,
} from '@/lib/redux/slice/profileSlice'
import { fetchWalletScreen } from '@/lib/redux/slice/walletTransactionsSlice'
import { useVipStatus } from '@/hooks/useVipStatus'
import Vip from './components/Vip'
import Settings from './components/Settings'
import ProfileSection from './components/ProfileSection'
import Earnings from './components/Earnings'
import Achievements from './components/Achievements'
import Leadership from './components/Leadership'
import SpinWin from './components/SpinWin'
import LegalCompliance from './components/LegalCompliance'
import MyEarningCard from '../Wallet/Components/MyEarningCard'

export default function MyProfile() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { signOut, token } = useAuth()
  const {
    details: profile,
    stats,
    detailsStatus,
    statsStatus,
    error,
  } = useSelector((state) => state.profile)

  // VIP status using custom hook
  const { vipStatus, isLoading: vipLoadingStatus, forceRefreshVipStatus } = useVipStatus()
  // Get wallet screen data from Redux store
  const { walletScreen } = useSelector((state) => state.walletTransactions)
  const coinBalance = walletScreen?.wallet?.balance || 0
  const xpCurrent = walletScreen?.xp?.current || 0
  const xpLevel = walletScreen?.xp?.level || 1
  const balance = coinBalance || 0

  const themeLabel = useMemo(() => {
    return 'Dark Mode'
  }, [profile?.profile?.theme])

  const notificationsEnabled =
    (profile?.profile?.notifications ?? false) === true

  const handleEditProfile = () => router.push('/edit-profile')

  const handleVipUpgrade = () => {
    router.prefetch('/BuySubscription')
    router.push('/BuySubscription', { scroll: false })
  }

  // Prefetch pages on component mount for smooth navigation
  useEffect(() => {
    router.prefetch('/BuySubscription')
    router.prefetch('/Ticket')
    router.prefetch('/spin-wheel')
  }, [router])

  // Refresh on mount — only if cache is stale, always background so UI never flickers
  useEffect(() => {
    if (!token) return

    const refreshTimer = setTimeout(() => {
      const state = require("@/lib/redux/store").store.getState().walletTransactions
      const ts = state.walletScreenCacheTimestamp
      const STALE_MS = 60 * 1000 // 1 minute
      if (!ts || Date.now() - ts > STALE_MS) {
        dispatch(fetchUserProfile({ token, force: true, background: true }))
        dispatch(fetchWalletScreen({ token, force: true, background: true }))
        dispatch(fetchProfileStats({ token, force: true, background: true }))
        forceRefreshVipStatus()
      }
    }, 100)

    return () => clearTimeout(refreshTimer)
  }, [token, dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when app comes to foreground — debounced + stale check
  useEffect(() => {
    if (!token) return

    let focusTimeoutId = null

    const handleFocus = () => {
      if (focusTimeoutId) clearTimeout(focusTimeoutId)
      focusTimeoutId = setTimeout(() => {
        const state = require("@/lib/redux/store").store.getState().walletTransactions
        const ts = state.walletScreenCacheTimestamp
        const STALE_MS = 60 * 1000
        if (!ts || Date.now() - ts > STALE_MS) {
          dispatch(fetchUserProfile({ token, force: true, background: true }))
          dispatch(fetchWalletScreen({ token, force: true, background: true }))
          dispatch(fetchProfileStats({ token, force: true, background: true }))
          forceRefreshVipStatus()
        }
      }, 500)
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      if (focusTimeoutId) clearTimeout(focusTimeoutId)
    }
  }, [token, dispatch]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleNotifications = async () => {
    if (!profile || !token) return
    const original = profile.profile?.notifications ?? false
    const next = !original

    try {
      // When re-enabling, save the timestamp to the backend profile so it
      // persists across devices, logouts, and account switches.
      const profileData = { notifications: next };
      if (next === true) {
        profileData.notificationsReenabledAt = new Date().toISOString();
      }

      await dispatch(
        updateUserProfile({
          profileData,
          token,
        }),
      ).unwrap()
    } catch (error) {
      alert('Failed to update notification settings. Please try again.')
    }
  }

  // Only show loading if we have NO cached data at all
  // This allows showing cached data immediately while refreshing in background
  const hasCachedData = profile || stats || vipStatus
  const isLoading =
    !hasCachedData &&
    (detailsStatus === 'loading' ||
      statsStatus === 'loading' ||
      vipLoadingStatus === 'loading')
  const hasFailed =
    detailsStatus === 'failed' ||
    statsStatus === 'failed' ||
    vipLoadingStatus === 'failed'

  // Only show loading screen if we have absolutely no data
  // Otherwise, show cached data immediately and refresh in background
  if (isLoading) {
    return (
      <div className='min-h-screen bg-black flex justify-center items-center text-white text-xl'>
        Loading Profile...
      </div>
    )
  }

  // Only show error if we have no cached data to fall back to
  if (hasFailed && !hasCachedData) {
    return (
      <div className='min-h-screen bg-black flex justify-center items-center text-red-500 text-xl'>
        Error: {error || 'Failed to load profile data.'}
      </div>
    )
  }

  return (
    <div className='min-h-screen overflow-x-hidden bg-black flex justify-center'>
      <div className='relative w-full max-w-md min-h-screen bg-black pb-8'>
        <div className='absolute top-[8px] left-4 sm:left-5 font-normal text-[#A4A4A4] text-[10px] leading-3'>
          App Version: V0.0.1
        </div>

        <header className='flex flex-col w-full items-start gap-2 px-3 sm:px-4 pb-3 absolute top-[44px] left-0'>
          <div className='flex items-center gap-4 w-full'>
            <button
              className='relative w-6 h-6 flex-shrink-0'
              aria-label='Go back'
              onClick={() => router.back()}
            >
              <Image
                width={24}
                height={24}
                className='w-6 h-6'
                alt='Back'
                src='https://c.animaapp.com/V1uc3arn/img/arrow-back-ios-new@2x.png'
                loading='eager'
                decoding='async'
                priority
              />
            </button>

            <h1 className='font-semibold text-white text-xl leading-5'>
              My Profile
            </h1>
          </div>
        </header>

        <main className='flex flex-col w-full items-center gap-6 absolute top-[110px] left-0 px-1 sm:px-2'>
          <ProfileSection
            profile={profile}
            vipStatus={vipStatus}
            handleEditProfile={handleEditProfile}
          />
          <MyEarningCard token={token} />
          <Achievements />
          <Vip vipStatus={vipStatus} handleVipUpgrade={handleVipUpgrade} />
          <Leadership />
          <SpinWin />
          <Settings
            profile={profile}
            themeLabel={themeLabel}
            notificationsEnabled={notificationsEnabled}
            handleToggleNotifications={handleToggleNotifications}
            signOut={signOut}
          />
          <LegalCompliance />
        </main>
      </div>
    </div>
  )
}
