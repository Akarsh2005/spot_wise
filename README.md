

SpotWise

A complete service–seeker and service–provider platform offering "real-time booking, messaging, payments, and location-based services".

Table of Contents

* [Project Overview](#project-overview)
* [Features](#features)

  * [Seeker Features](#seeker-features)
  * [Provider Features](#provider-features)
  * [General Features](#general-features)
* [Project Structure](#project-structure)
* [Tech Stack](#tech-stack)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Configuration](#configuration)
* [Running the Application](#running-the-application)
* [API Documentation](#api-documentation)
* [Features Guide](#features-guide)
* [Troubleshooting](#troubleshooting)
* [Contributing](#contributing)
* [License](#license)
* [Support](#support)

---

## Project Overview

"SpotWise" is a full-stack web application designed to seamlessly connect individuals seeking services with professional providers.

It offers:

* A **Seeker Portal** for browsing, booking, and chatting
* A **Provider Portal** for managing services and requests
* **Real-time messaging** powered by Socket.io
* **Secure payments** via Stripe
* **Map-based provider discovery** using TomTom & Leaflet

---

## ⭐ Features

### 🧍 Seeker Features

* Register & authenticate (JWT)
* Explore providers via an interactive map
* Book services with date/time selection
* Real-time chat with providers
* Track booking status & history
* Manage seeker profile
* Receive real-time push notifications

### 🧑‍🔧 Provider Features

* Dedicated provider login & authentication
* Manage service availability
* Accept or reject booking requests
* Real-time chat with seekers
* View upcoming & past bookings
* Profile management
* Track earnings

### ⚙️ General Features

* Real-time notifications (Socket.io)
* Secure JWT authentication
* Responsive UI (Tailwind + Bootstrap)
* Location-based features with TomTom + Leaflet
* Chat with full message history
* Stripe payment integration

---

## 📁 Project Structure

```
spot_wise/
├── backend/                # Express API Server
├── frontend/               # Seeker React App
└── provider_ui/            # Provider React App
```

Detailed structure is preserved exactly as in your original version.

---

## 🛠 Tech Stack

### Backend

* Node.js, Express.js
* MongoDB + Mongoose
* JWT Authentication
* Socket.io
* Stripe Payments
* Multer (file uploads)
* Dialogflow (AI)
* node-cron (scheduled tasks)

### Frontend (Seeker & Provider)

* React 19 + Vite
* Tailwind CSS, Bootstrap, SASS
* Axios, React Router
* Socket.io Client
* Leaflet, TomTom Maps, React Map GL
* Chart.js & react-chartjs-2
* react-datepicker, react-toastify

---

## 📦 Prerequisites

* **Node.js** v14+
* **npm** or **yarn**
* **MongoDB** (local/cloud)
* **Git**
* API keys:

  * Google Dialogflow
  * Stripe
  * TomTom Maps

---

## 🧩 Installation

### 1. Clone Repository

```bash
git clone https://github.com/Akarsh2005/spot_wise.git
cd spot_wise
```

### 2. Install Backend

```bash
cd backend
npm install
```

### 3. Install Seeker Frontend

```bash
cd frontend
npm install
```

### 4. Install Provider Frontend

```bash
cd provider_ui
npm install
```

---

## ⚙️ Configuration

### Backend `.env`

```env
MONGODB_URI=your_mongodb_url
JWT_SECRET=your_jwt_secret

# Dialogflow
GOOGLE_PROJECT_ID=xxxx
GOOGLE_PRIVATE_KEY=xxxx
GOOGLE_CLIENT_EMAIL=xxxx

# Stripe
STRIPE_SECRET_KEY=xxxx
STRIPE_PUBLISHABLE_KEY=xxxx

PORT=5000
NODE_ENV=development
```

### Frontend `.env`

(Add in both `frontend/` and `provider_ui/`)

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_TOMTOM_API_KEY=your_tomtom_api_key
```

---

## ▶️ Running the Application

### 🖥 Backend

```bash
cd backend
npm run server
```

Runs at: **[http://localhost:5000](http://localhost:5000)**

### 🌐 Seeker Frontend

```bash
cd frontend
npm run dev
```

Runs at: **[http://localhost:5173](http://localhost:5173)**

### 🧑‍🔧 Provider Frontend

```bash
cd provider_ui
npm run dev
```

Runs at: **[http://localhost:5174](http://localhost:5174)**

---

## 📚 API Documentation

### 🔐 Auth

| Method | Endpoint                | Description           |
| ------ | ----------------------- | --------------------- |
| POST   | /api/seekers/register   | Register a new seeker |
| POST   | /api/seekers/login      | Seeker Login          |
| POST   | /api/providers/register | Register provider     |
| POST   | /api/providers/login    | Provider Login        |

### 👤 Seeker

| Method | Endpoint               |
| ------ | ---------------------- |
| GET    | /api/seekers/profile   |
| PUT    | /api/seekers/profile   |
| GET    | /api/seekers/providers |

### 👨‍🔧 Provider

| Method | Endpoint               |
| ------ | ---------------------- |
| GET    | /api/providers/profile |
| PUT    | /api/providers/profile |

### 📅 Booking

| Method | Endpoint             |
| ------ | -------------------- |
| POST   | /api/bookings/create |
| GET    | /api/bookings        |
| PUT    | /api/bookings/:id    |
| DELETE | /api/bookings/:id    |

### 💬 Chat

| Method | Endpoint          |
| ------ | ----------------- |
| POST   | /api/chat/create  |
| GET    | /api/chat/:id     |
| POST   | /api/message/send |

---

## 📝 Features Guide

### 🔴 Real-time Chat

* Socket.io ensures instant message delivery
* Seen/received message states
* Notification pop-ups included

### 📆 Booking Flow

1. Seeker finds a provider on the map
2. Sends booking request
3. Provider accepts/rejects
4. Real-time updates for both
5. Chat opens after confirmation

### 🔔 Notifications

* Booking updates
* New messages
* Status changes
* Provider availability updates

---

## 🛠 Troubleshooting

### ❗ Port Already in Use

Run:

```bash
netstat -ano | findstr :5000
```

Kill using:

```bash
taskkill /PID <id> /F
```

### ❗ CORS Error

Ensure backend allows:

```
http://localhost:5173
http://localhost:5174
```

### ❗ MongoDB Connection Problems

* Check your MONGODB_URI
* Ensure local MongoDB is running

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Commit & push
4. Open a pull request

---

## 📄 License

This project is under the **ISC License**.

---

## 💬 Support

Have questions?
👉 Create an issue in the GitHub repository.

---

If you want, I can also create a **badges section**, **screenshots section**, or **demo video section** to make it more professional.
