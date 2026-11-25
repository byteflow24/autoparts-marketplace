/**
 * useCartCount.js
 * frontend/src/hooks/useCartCount.js
 *
 * Fixed: uses a different approach — instead of relying only on
 * custom events (which can miss if dispatch timing is off),
 * this hook subscribes to a shared cartStore that any component
 * can call directly. Much more reliable.
 */

import { useState, useEffect } from 'react'

function readCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
  } catch {
    return 0
  }
}

// Module-level listeners array — shared across all hook instances
const listeners = new Set()

// This is what every cart-writing function calls
export function notifyCartChange() {
  listeners.forEach(fn => fn(readCount()))
}

export function useCartCount() {
  const [count, setCount] = useState(readCount)

  useEffect(() => {
    // Register this component's setter
    listeners.add(setCount)

    // Also listen for storage events (other tabs)
    function onStorage() { setCount(readCount()) }
    window.addEventListener('storage', onStorage)

    return () => {
      listeners.delete(setCount)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return count
}