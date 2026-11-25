/**
 * cartEvent.js
 * frontend/src/utils/cartEvent.js
 *
 * Call this after EVERY localStorage cart write.
 * Directly notifies all mounted useCartCount hooks — no event bus needed.
 */

import { notifyCartChange } from '../hooks/useCartCount'

export function dispatchCartUpdate() {
  notifyCartChange()
}