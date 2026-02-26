/**
 * Cart Service — orchestrates cart store actions + side effects (toasts, announcements).
 *
 * The cart store itself is a pure state container. This service layer
 * wraps store actions with UI feedback (toasts) and accessibility announcements.
 */

import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'

/**
 * Add a product to the cart with toast feedback.
 * @param {object} product - Product object
 * @param {number} quantity - Quantity to add
 * @param {object} options - Product options (accessories, software, etc.)
 * @param {{ announce?: (msg: string) => void }} extra - Optional extras
 */
export function addToCart(product, quantity = 1, options = {}, { announce } = {}) {
  useCartStore.getState().addItem(product, quantity, options)
  useUIStore.getState().showToast(`${product.name} added to cart`)
  announce?.(`${product.name} added to cart`)
}

/**
 * Remove a product from the cart with toast feedback.
 * @param {string} productId - Product ID
 * @param {string} productName - Product name (for toast)
 */
export function removeFromCart(productId, productName) {
  useCartStore.getState().removeItem(productId)
  useUIStore.getState().showToast(`${productName} removed from cart`)
}

/**
 * Update product quantity in the cart.
 * @param {string} productId - Product ID
 * @param {number} quantity - New quantity
 */
export function updateCartQuantity(productId, quantity) {
  useCartStore.getState().updateQuantity(productId, quantity)
}

/**
 * Clear the cart entirely with toast feedback.
 */
export function clearCart() {
  useCartStore.getState().clearCart()
  useUIStore.getState().showToast('Cart cleared')
}

/**
 * Compute a summary of the current cart.
 * @param {Array} items - Cart items array
 * @returns {{ totalItems: number, uniqueProducts: number }}
 */
export function getCartSummary(items) {
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    uniqueProducts: items.length,
  }
}
