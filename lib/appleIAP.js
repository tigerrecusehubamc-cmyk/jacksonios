import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases'

export const APPLE_IAP_PRODUCT_IDS = {
  bronze_weekly: 'bronze_weekly',
  bronze_monthly: 'bronze_monthly',
  bronze_yearly: 'bronze_yearly',
  gold_weekly: 'gold_weekly',
  gold_monthly: 'gold_monthly',
  gold_yearly: 'gold_yearly',
  platinum_weekly: 'platinum_weekly',
  platinum_monthly: 'platinum_monthly',
  platinum_yearly: 'platinum_yearly',
}

export function getAppleProductId(tierId, plan) {
  const key = `${tierId}_${plan}`
  return APPLE_IAP_PRODUCT_IDS[key] || null
}

export async function isAppleIAPAvailable() {
  try {
    const { isBillingSupported } = await NativePurchases.isBillingSupported()
    console.log('[AppleIAP] Billing supported:', isBillingSupported)
    return isBillingSupported === true
  } catch (err) {
    console.warn('[AppleIAP] isBillingSupported check failed:', err)
    return false
  }
}

export async function getSubscriptionProduct(productId) {
  try {
    console.log('[AppleIAP] Getting product:', productId)

    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [productId],
      productType: PURCHASE_TYPE.SUBS,
    })

    if (products && products.length > 0) {
      console.log('[AppleIAP] Product found:', {
        id: products[0].productIdentifier,
        price: products[0].price,
        currency: products[0].priceLocale
      })
      return products[0]
    }

    console.warn('[AppleIAP] Product not found:', productId)
    return null
  } catch (err) {
    console.error('[AppleIAP] getSubscriptionProduct error:', err)
    throw err
  }
}

export async function purchaseSubscription(productId) {
  try {
    console.log('[AppleIAP] Initiating purchase:', {
      productIdentifier: productId,
      productType: 'SUBS'
    })

    const result = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: PURCHASE_TYPE.SUBS,
      // Keep the StoreKit transaction pending until our backend validates the
      // receipt and activates the entitlement.
      autoAcknowledgePurchases: false,
    })

    // @capgo/native-purchases v7 returns `receipt` and `purchaseDate`.
    // Keep the legacy fallbacks so an older native shell can still complete a
    // purchase while web assets are being rolled forward independently.
    const transactionId = result.transactionId
    const purchasedProductId = result.productIdentifier || productId
    const transactionReceipt = result.receipt || result.transactionReceipt
    const purchaseDate = result.purchaseDate || result.transactionDate

    if (!transactionId) {
      throw new Error('App Store purchase did not return a transaction ID')
    }
    if (!purchasedProductId) {
      throw new Error('App Store purchase did not return a product ID')
    }
    if (!transactionReceipt) {
      throw new Error('App Store purchase did not return a verification receipt')
    }

    console.log('[AppleIAP] Purchase successful:', {
      transactionId: transactionId.substring(0, 20) + '...',
      productId: purchasedProductId,
      hasReceipt: true
    })

    return {
      transactionId,
      productId: purchasedProductId,
      transactionReceipt,
      transactionDate: purchaseDate,
    }
  } catch (err) {
    console.error('[AppleIAP] purchaseSubscription error:', err)

    if (err.code === 'E_USER_CANCELLED' || err.code === 2) {
      err.userMessage = 'Purchase cancelled'
      err.isCancelled = true
    } else if (err.code === 'E_NETWORK_ERROR') {
      err.userMessage = 'Network error. Please check your connection and try again.'
    } else if (err.code === 'E_UNABLE_TO_BUY') {
      err.userMessage = 'Unable to make purchases. Please check your device settings.'
    } else {
      err.userMessage = 'Purchase failed. Please try again.'
    }

    throw err
  }
}

export async function restorePurchases() {
  try {
    console.log('[AppleIAP] Restoring purchases...')

    const result = await NativePurchases.restorePurchases()

    console.log('[AppleIAP] Restore complete:', {
      count: result.transactions?.length || 0
    })

    return result
  } catch (err) {
    console.error('[AppleIAP] restorePurchases error:', err)
    throw err
  }
}

export async function getPendingPurchases() {
  try {
    const result = await NativePurchases.getPendingPurchases()
    return result.transactions || []
  } catch (err) {
    console.error('[AppleIAP] getPendingPurchases error:', err)
    return []
  }
}

export async function finishTransaction(transactionId) {
  try {
    await NativePurchases.acknowledgePurchase({
      // @capgo/native-purchases uses purchaseToken for both platforms; on iOS
      // this value is the StoreKit transaction ID.
      purchaseToken: transactionId
    })
    console.log('[AppleIAP] Transaction finished:', transactionId)
  } catch (err) {
    console.error('[AppleIAP] finishTransaction error:', err)
    throw err
  }
}
