// import { useState } from 'react'
import { Routes, Route, Navigate} from 'react-router-dom'
import { AuthProvider } from './context/Authprovider'
import { MainLayouts } from './layouts/MainLayouts'
import { ProtectedRoute } from './components/ProtectedRoute'

import { HomePage } from './pages/home/HomePage'
import { LoginPage } from './pages/auth/LoginPage'
import {RegisterPage} from './pages/auth/RegisterPage'
import { RegisterCustomerPage }  from './pages/auth/RegisterCustomerPage'
import { RegisterGaragePage }    from './pages/auth/RegisterGaragePage'

import {SearchPage} from './pages/search/SearchPage'

// CUSTOMER IMPORTS
import {MyOrdersPage} from './pages/orders/MyOrdersPage'
import {OrderDetailsPage} from './pages/orders/OrderDetailsPage'
import {CartPage} from './pages/cart/CartPage'
import {CheckoutPage} from './pages/checkout/CheckoutPage'
import { MyHubPage } from './pages/hub/MyHubPage'

// PART DETAILS
import { PartDetailPage } from './pages/parts/PartDetailPage'

// GARAGE PUBLIC PROFILE
import { GarageProfilePage } from './pages/garage/GarageProfilePage'

// GARAGE IMPORTS
import {OrdersPage} from './pages/garage/OrdersPage'
import {OrderDetailPage} from './pages/garage/OrderDetailPage'
import {DashboardPage} from './pages/garage/DashboardPage'
import {InventoryPage} from './pages/garage/InventoryPage'
import {EditGarageProfilePage} from './pages/garage/EditGarageProfilePage'
import { AddPartPage } from './pages/parts/AddPartPage'
import { EditPartPage } from './pages/parts/EditPartPage'

// SHARED PROFILE (both roles)
import { ProfilePage } from './pages/profile/ProfilePage'

import './App.css'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MainLayouts />}>

          {/* ── Public routes ───────────────────────────── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/customer" element={<RegisterCustomerPage />} />
          <Route path="/register/garage" element={<RegisterGaragePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/parts/:part_id" element={<PartDetailPage />} />
          <Route path="/garage/:garage_id" element={<GarageProfilePage />} />

          {/* ── Any authenticated user ──────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* ── Customer-only routes ────────────────────── */}
          <Route element={<ProtectedRoute role="customer" />}>
            {/* <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/orders/:order_id" element={<OrderDetailsPage />} /> */}
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/hub" element={<MyHubPage />} />
          </Route>

          {/* ── Garage-only routes ──────────────────────── */}
          <Route element={<ProtectedRoute role="garage" />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/garage/inventory" element={<InventoryPage />} />
            <Route path="/garage/profile/edit" element={<EditGarageProfilePage />} />
            <Route path="/garage/orders" element={<OrdersPage />} />
            <Route path="/garage/orders/:order_id" element={<OrderDetailPage />} />
            <Route path="/parts/add" element={<AddPartPage />} />
            <Route path="/parts/edit/:garage_part_id" element={<EditPartPage />} />
          </Route>

          {/* ── Fallback ────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App