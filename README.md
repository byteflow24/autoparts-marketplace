# 🚗 AutoParts Business Platform

A full-stack marketplace connecting **garages (sellers)** with **customers (buyers)** for automotive parts.

---

## 📌 Overview

This system allows:

### 👨‍🔧 Garages

* Manage inventory (auto parts)
* Add parts using part number or manual selection
* Set pricing, quantity, and compatibility
* Receive and manage customer orders

### 🚗 Customers

* Search for parts (by part number or filters)
* Compare garages and prices
* Order parts (delivery or installation)
* Manage cart and profile

---

## 🏗️ System Architecture

```text
        Customers / Garages
                │
                ▼
        Frontend (Web / App)
                │
                ▼
        Flask Backend (API + Logic)
                │
                ▼
        PostgreSQL Database
```

---

## 🔄 Main System Flow

```text
Customer:
Search Part → View Garages → Add to Cart → Checkout → Order Created

Garage:
Add Parts → Manage Inventory → Receive Orders → Process Orders
```

---

## 🏗️ Project Structure

```
GarageBusinessProject/
│
├── app/
│   ├── auth/        # Authentication (login/register)
│   ├── garage/      # Garage dashboard & management
│   ├── parts/       # Parts & inventory system
│   ├── orders/      # Order processing
│   ├── search/      # Search & filtering
│   ├── models/      # Database models
│   ├── utils/       # Helper functions
│   ├── templates/   # HTML templates
│   ├── static/      # CSS, JS, images
│
├── config.py
├── run.py
```

---

## ⚙️ Tech Stack

* Backend: Python (Flask)
* Database: PostgreSQL (pgAdmin 4)
* Frontend: HTML, CSS, JavaScript (later Flutter for mobile)
* Forms: Flask-WTF

---

## 🧠 Core Features

* 🔐 Authentication (Garage / Customer)
* 🏪 Garage Profile & Dashboard
* 📦 Inventory Management
* 🔎 Advanced Search System
* 🛒 Cart & Orders
* 🔔 Notifications (low stock, orders)

---

## 🗄️ Database Design (Simplified ER Diagram)

```text
User
 ├── id
 ├── name
 ├── email
 └── role
        │
        ▼
Garage
 ├── id
 ├── user_id
 ├── name
 └── location
        │
        ▼
GaragePart ───────────────► Part
 ├── id                    ├── id
 ├── garage_id             ├── name
 ├── part_id               ├── part_number
 ├── price                 └── category
 └── quantity

Order
 ├── id
 ├── customer_id
 ├── garage_id
 └── status
        │
        ▼
OrderItem
 ├── id
 ├── order_id
 ├── garage_part_id
 └── quantity
```

---

## 🚀 Development Plan

1. Authentication System
2. Garage Dashboard
3. Parts Management
4. Search System
5. Orders & Checkout
6. Notifications
7. Mobile App (Flutter)

---

## ⚠️ Notes

* Start with backend logic before UI
* Keep business logic in `services.py`, not routes
* Use indexing in PostgreSQL for performance
* Avoid scraping external sites without APIs

---

## 📈 Future Improvements

* REST API for mobile app
* Payment integration
* Real-time notifications
* External parts API integration

---

## 👨‍💻 Author

Developed by M. Taha Srarfi

---
