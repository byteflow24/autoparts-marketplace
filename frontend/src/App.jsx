// import { useState } from 'react'
import { Routes, Route, Navigate} from 'react-router-dom'
import { AuthProvider } from './context/Authcontext'
import { MainLayouts } from './layouts/MainLayouts'
import { ProtectedRoute } from './components/ProtectedRoute'

import { HomePage } from './pages/home/HomePage'
import { LoginPage } from './pages/auth/LoginPage'
import {RegisterPage} from './pages/auth/RegisterPage'
import { RegisterCustomerPage }  from './pages/auth/RegisterCustomerPage'
import { RegisterGaragePage }    from './pages/auth/RegisterGaragePage'

import {SearchPage} from './pages/search/SearchPage'
// import {CartPage} from './pages/CartPage'
import {OrdersPage} from './pages/garage/OrdersPage'
import {OrderDetailPage} from './pages/garage/OrderDetailPage'
// import {ProfilePage} from './pages/ProfilePage'
import {DashboardPage} from './pages/garage/DashboardPage'
import {InventoryPage} from './pages/garage/InventoryPage'
import {EditProfilePage} from './pages/garage/EditProfilePage'
import { AddPartPage } from './pages/parts/AddPartPage'
import { EditPartPage } from './pages/parts/EditPartPage'


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

          {/* ── Customer-only routes ────────────────────── */}
          <Route element={<ProtectedRoute role="customer" />}>
            <Route path="/search" element={<SearchPage />} />
            {/* <Route path="/cart" element={<CartPage />} /> */}
            
          </Route>
          
          {/* ── Garage-only routes ──────────────────────── */}
          <Route element={<ProtectedRoute role="garage" />}>
            {/* <Route path="/profile" element={<ProfilePage />} /> */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/garage/inventory" element={<InventoryPage />} />
            <Route path="/garage/profile/edit" element={<EditProfilePage />} />
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
