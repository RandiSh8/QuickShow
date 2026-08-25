# 🎬 QuickShow - Movie Ticket Booking & Management System

QuickShow is a modern, full-stack movie ticket booking web application built with **React (Vite)**, **Node.js**, **Express**, **MongoDB**, **Clerk Authentication**, and **Inngest**. It provides an intuitive platform for users to browse upcoming movies, select seats, and book tickets, along with a comprehensive Admin Dashboard to manage shows, bookings, and revenue analytics.

---

## ✨ Features

### 👤 User Features
- **Authentication**: Seamless authentication (Sign Up / Sign In / Social Logins) powered by Clerk.
- **Movie Discovery**: Explore "Now Playing" and "Coming Soon" movies synced directly with The Movie Database (TMDB) API.
- **Interactive Seat Selection**: Real-time interactive seat grid to select and reserve preferred seats for any showtime.
- **My Bookings**: Track past and upcoming movie ticket reservations with date, time, price, and seat numbers.
- **Favorites List**: Save and manage favorite movies connected to Clerk user metadata.

### 🛡️ Admin Features
- **Admin Dashboard**: Overview of key business metrics including total bookings, revenue, and active shows.
- **Add Shows**: Schedule movie screenings by selecting TMDB movies, dates, custom showtimes, and ticket pricing.
- **List Shows**: View all scheduled shows along with seat occupancy rates.
- **List Bookings**: Comprehensive table of all customer bookings with user details and payment amounts.

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: React 18 (Vite)
- **Styling**: TailwindCSS 4
- **Routing**: React Router v7
- **Auth**: `@clerk/clerk-react`
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

### **Backend**
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ORM
- **Auth Middleware**: `@clerk/express`
- **Background Tasks**: Inngest SDK & Inngest CLI
- **API Integration**: TMDB (The Movie Database) API

---

## 📂 Project Structure

```text
QuickShow/
├── client/                     # Frontend React Application
│   ├── src/
│   │   ├── components/         # UI Components & Admin Shells
│   │   ├── context/            # Global AppContext (Axios, State, Auth)
│   │   ├── pages/              # User Pages (Home, Movies, SeatLayout, MyBookings, etc.)
│   │   │   └── admin/          # Admin Dashboard Pages (AddShows, ListShows, ListBookings)
│   │   ├── App.jsx             # Main Route Configuration
│   │   └── main.jsx            # Entry Point with Providers
│   └── package.json
│
├── server/                     # Backend Node.js Express Application
│   ├── configs/                # Database Connection (db.js)
│   ├── controllers/            # API Controllers (show, booking, user, admin)
│   ├── inngest/                # Inngest Background Functions (User Sync)
│   ├── middleware/             # Admin Protection & Clerk Auth Middleware
│   ├── models/                 # Mongoose Models (User, Movie, Show, Booking)
│   ├── routes/                 # Express API Routers
│   ├── server.js               # Main Server Entry Point
│   └── package.json
│
└── README.md
```

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB server)
- Clerk developer account
- TMDB API Key

---

### 1️⃣ Environment Setup

#### Backend Environment Configuration (`server/.env`)
Create a `.env` file in the `server` directory:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
TMDB_API_KEY=your_tmdb_bearer_token
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key
```

#### Frontend Environment Configuration (`client/.env`)
Create a `.env` file in the `client` directory:

```env
VITE_BASE_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CURRENCY=$
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/tpa/t/p/original
```

---

### 2️⃣ Installation & Running Locally

#### Start Backend Server
```bash
cd server
npm install
npm run server
```
*The backend server runs at `http://localhost:3000`.*

#### Start Frontend Client
```bash
cd client
npm install
npm run dev
```
*The frontend client runs at `http://localhost:5173` or `http://localhost:5174`.*

#### Start Inngest Dev Server (Optional for User Sync)
```bash
cd server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

---

## 🔑 Admin Access Setup

1. Sign up/in via Clerk in your application.
2. Go to [Clerk Dashboard](https://dashboard.clerk.com/) -> **Users** -> Select your User.
3. Under **Private Metadata** (or **Public Metadata**), add the admin role:
   ```json
   {
     "role": "admin"
   }
   ```
4. Navigate to `/admin` in your browser to access the Admin Panel.

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
