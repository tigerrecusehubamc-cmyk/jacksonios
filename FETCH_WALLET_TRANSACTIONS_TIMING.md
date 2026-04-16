# fetchWalletTransactions() API Call Timing

## When is it Called?

### YES, it IS called during login/signup ✅

**Location:** `contexts/AuthContext.js` → Line 626 (in the consolidated data fetching effect)

**Timing:** **2 seconds AFTER successful login** (deferred, non-blocking)

---

## Complete Timeline During Login

### Phase 1: Immediate Login (handleAuthSuccess)
**Duration:** ~300-500ms (waits for critical data before navigation)

**APIs called:**
- `fetchUserProfile()` - Get user metadata
- `fetchWalletScreen()` - Get wallet balance, XP, level
- `fetchVipStatus()` - Get VIP tier info
- `fetchGamesBySection()` - Most Played & Swipe games
- `fetchNonGameOffers()` - Cashback offers
- `getXPTierProgressBar()` - XP progress info

**Result:** Returns and navigates to homepage immediately

---

### Phase 2: Background Fetch 1 (300ms after token set)
**Location:** Line 524-537 (AuthContext consolidated effect)

**APIs called:**
- `fetchWalletScreen()` - (re-fetched, may have cache)

---

### Phase 3: Background Fetch 2 (400ms after token set)
**Location:** Line 544-573

**APIs called:**
- `fetchDailyCalendar()` - Daily challenge calendar
- `fetchDailyToday()` - Today's rewards
- `fetchBonusDays()` - Bonus days info

---

### Phase 4: Background Fetch 3 (8 seconds after token set)
**Location:** Line 576-613

**APIs called:**
- `fetchGamesBySection()` - Additional game sections (Leadership, Highest Earning, Cash Coach Recommendation)
- `fetchMostPlayedScreenGames()` - More detailed games

---

### 🔴 Phase 5: Heavy Data Fetch (2 seconds after token set) ⭐
**Location:** Line 617-643

**THIS IS WHERE fetchWalletTransactions() IS CALLED**

```javascript
const heavyTimer = setTimeout(() => {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  
  // Skip these routes to avoid unnecessary heavy data loads
  const skipHeavyRoutes = ["/Ticket", "/AchieveGoals", "/cash-coach", "/contact-us", "/privacy-policy", "/reset-password"];
  const isLightRoute = skipHeavyRoutes.some((r) => path === r || path.startsWith(r + "/"));
  
  if (isLightRoute) return;

  dispatch(fetchAccountOverview());
  dispatch(fetchFinancialGoals(token));
  dispatch(fetchVipTiers("US"));
  dispatch(fetchWalletTransactions({ token, limit: 5 }));  // ⭐ HERE!
  dispatch(fetchFullWalletTransactions({...}));
  dispatch(fetchLocationHistory(token));
  dispatch(fetchUserAchievements({...}));
}, 2000); // ⭐ 2 SECOND DELAY
```

---

## Answer: When During Login/Signup?

| API Call | Time | Phase | Status |
|----------|------|-------|--------|
| fetchUserProfile | 0ms | Immediate (critical) | ✅ Waits |
| fetchWalletScreen | 0ms (Phase 1)<br>300ms (Phase 2) | Immediate + Background | ✅ Waits for Phase 1 |
| **fetchWalletTransactions** | **2000ms (2 sec)** | **Heavy Background** | ❌ Does NOT wait |
| fetchGamesBySection | 0ms + 8000ms | Immediate + Deferred | ✅ Waits for initial |

---

## Summary

**Short Answer:** ✅ **YES, during signup/login**

**When?** **2 seconds AFTER successful login** - in the background without blocking UI

**Why?** It's part of the "PRIORITY 5: Heavy data after 2s" to avoid network congestion on app startup

**Does it block navigation?** ❌ **NO** - User is already on homepage, this loads in background

**Can it be skipped?** ✅ **YES** - If the current route is in skipHeavyRoutes list (e.g., /Ticket, /AchieveGoals, etc.)

---

## Also Called...

**Also called from:**
1. **TransactionHistory component** (on Wallet page)
   - When component mounts (if status === 'idle')
   - On app focus (in background)

2. **AuthContext Focus Handler** (line 656-782)
   - When user returns to app (via focus event)
   - Refreshes with `force: true` after debounce

---

## Code Reference
- **AuthContext consolidated effect:** Line 435-651
- **Heavy data fetch (where fetchWalletTransactions is):** Line 617-643
- **Timeout definition:** Line 626 contains the actual API call
