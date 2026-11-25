/**
 * PartImages.js
 * Place at: frontend/src/utils/PartImages.js
 *
 * Single source of truth for category → local image.
 * Used by HomePage, SearchPage, CartPage, and any part card.
 *
 * Usage:
 *   import { getPartImage, CATEGORY_IMAGES, PART_IMAGE_FALLBACK } from '../../utils/PartImages'
 *   <img src={getPartImage(part.image_url, part.category)} alt={part.name} />
 */

import imgBrakes       from '../assets/images/brake_rotors.jpg'
import imgEngine       from '../assets/images/engine_parts.jpg'
import imgElectrical   from '../assets/images/electric.jpg'
import imgSuspension   from '../assets/images/car_suspension.jpg'
import imgTransmission from '../assets/images/car_transmission.jpg'
import imgCooling      from '../assets/images/coolant_system.jpg'
import imgExhaust      from '../assets/images/exhaust_system.jpg'
import imgBody         from '../assets/images/car_body.png'

export const CATEGORY_IMAGES = {
  Brakes:       imgBrakes,
  Engine:       imgEngine,
  Electrical:   imgElectrical,
  Suspension:   imgSuspension,
  Transmission: imgTransmission,
  Cooling:      imgCooling,
  Exhaust:      imgExhaust,
  Body:         imgBody,
}

export const PART_IMAGE_FALLBACK = imgBrakes

/**
 * Returns the best image for a part.
 * Priority: part.image_url → category image → fallback
 */
export function getPartImage(imageUrl, category) {
  if (imageUrl) return imageUrl
  return CATEGORY_IMAGES[category] || PART_IMAGE_FALLBACK
}

export const FEATURED_CATEGORIES = [
  { name: 'Brakes',       label: 'Brakes & Rotors',  img: imgBrakes       },
  { name: 'Engine',       label: 'Engine Parts',      img: imgEngine       },
  { name: 'Electrical',   label: 'Electrical',        img: imgElectrical   },
  { name: 'Suspension',   label: 'Suspension',        img: imgSuspension   },
  { name: 'Transmission', label: 'Transmission',      img: imgTransmission },
  { name: 'Cooling',      label: 'Cooling System',    img: imgCooling      },
  { name: 'Exhaust',      label: 'Exhaust',           img: imgExhaust      },
  { name: 'Body',         label: 'Body Parts',        img: imgBody         },
]