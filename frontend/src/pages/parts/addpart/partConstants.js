/**
 * partConstants.js
 * Place at: frontend/src/pages/parts/addpart/partConstants.js
 *
 * Shared constants, blank form state, and localStorage helpers for the Add Part flow.
 */

// ── Subcategory map ──────────────────────────────────────────────────────────
export const SUBCATEGORY_MAP = {
    Engine: [
      'Air Filter', 'Oil Filter', 'Fuel Filter', 'Spark Plugs', 'Ignition Coil',
      'Timing Belt / Chain', 'Timing Kit', 'Engine Gasket', 'Head Gasket',
      'Valve Cover Gasket', 'Oil Pump', 'Water Pump', 'Thermostat',
      'Engine Mount', 'Crankshaft', 'Camshaft', 'Piston & Rings',
      'Connecting Rod', 'Flywheel', 'Engine Sensor', 'Other Engine',
    ],
    Brakes: [
      'Brake Pads', 'Brake Rotors / Discs', 'Brake Drums', 'Brake Caliper',
      'Brake Master Cylinder', 'Brake Booster', 'Brake Lines & Hoses',
      'Brake Fluid Reservoir', 'ABS Sensor', 'ABS Module', 'Other Brakes',
    ],
    Suspension: [
      'Shock Absorber', 'Strut Assembly', 'Coil Spring', 'Leaf Spring',
      'Control Arm', 'Ball Joint', 'Tie Rod', 'Sway Bar Link',
      'Sway Bar Bushing', 'Wheel Bearing & Hub', 'Steering Rack',
      'Power Steering Pump', 'CV Axle / Shaft', 'Other Suspension',
    ],
    Electrical: [
      'Battery', 'Alternator', 'Starter Motor', 'Fuse & Relay',
      'Headlight Bulb', 'Tail Light', 'Turn Signal', 'Sensor (O2 / MAF / MAP)',
      'ECU / ECM', 'Body Control Module', 'Wiring Harness',
      'Horn', 'Wiper Motor', 'Window Motor', 'Other Electrical',
    ],
    Transmission: [
      'Transmission Fluid', 'Transmission Filter', 'Clutch Kit', 'Clutch Disc',
      'Pressure Plate', 'Release Bearing', 'Flywheel', 'Gear Shift Cable',
      'CV Joint', 'Differential', 'Transfer Case', 'Other Transmission',
    ],
    Cooling: [
      'Radiator', 'Coolant Reservoir', 'Coolant Hose', 'Radiator Cap',
      'Fan Clutch', 'Electric Cooling Fan', 'Water Pump', 'Thermostat',
      'Heater Core', 'Other Cooling',
    ],
    Exhaust: [
      'Muffler', 'Exhaust Pipe', 'Catalytic Converter', 'Oxygen Sensor',
      'Exhaust Manifold', 'Exhaust Gasket', 'Flex Pipe', 'Other Exhaust',
    ],
    Body: [
      'Hood', 'Front Bumper', 'Rear Bumper', 'Fender', 'Door Panel',
      'Side Mirror', 'Windshield', 'Rear Glass', 'Door Handle',
      'Grille', 'Headlight Assembly', 'Tail Light Assembly',
      'Trunk Lid', 'Roof Panel', 'Other Body',
    ],
    'A/C & Heating': [
      'A/C Compressor', 'A/C Condenser', 'A/C Evaporator', 'A/C Expansion Valve',
      'Cabin Air Filter', 'Blower Motor', 'Heater Hose', 'Other A/C & Heating',
    ],
    Fuel: [
      'Fuel Pump', 'Fuel Injector', 'Fuel Tank', 'Fuel Cap',
      'Fuel Pressure Regulator', 'Carburetor', 'Throttle Body', 'Other Fuel',
    ],
    Other: ['Other'],
  }
  
  export const CATEGORIES = Object.keys(SUBCATEGORY_MAP)
  
  // ── Blank part form ──────────────────────────────────────────────────────────
  export const BLANK_PART = {
    // catalog
    catalogQuery: '',
    selectedPart: null,   // { id, name, ... } if chosen from catalog
    creatingNew: false,   // true when typing a brand-new part
    name: '',
    part_number: '',
    brand: '',
    category: '',
    subcategory: '',
    description: '',
    country_of_origin: '',
    // inventory
    condition: 'new',
    price: '',
    cost_price: '',
    quantity: '',
    from_year: '',
    to_year: '',
    delivery_available: false,
    installation_available: false,
    // extra compat
    compatRows: [],
  }
  
  // ── localStorage session helpers ─────────────────────────────────────────────
  const LS_KEY = 'addpart_session'
  
  export function loadSession() {
    try {
      const raw = localStorage.getItem(LS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  
  export function saveSession(data) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
  }
  
  export function clearSession() {
    try { localStorage.removeItem(LS_KEY) } catch {}
  }