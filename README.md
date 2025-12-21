##Link-
https://blood-donation-server-rosy.vercel.app
---

## ✅ Server Repo — `README.md`


# 🩸 Blood Donation App (Server)

Backend API for the Blood Donation App built with **Node.js + Express** and deployed on **Vercel**.  
Uses **MongoDB Atlas + Mongoose** for database and **JWT** for authentication.

## 🚀 Live API
- https://blood-donation-server-rosy.vercel.app

Example endpoint:
- https://blood-donation-server-rosy.vercel.app/api/requests/pending-public?page=1&limit=3

---

## 🛠 Tech Stack
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Auth
- Vercel (Deployment)

---

## 📌 API Endpoints (sample)

### Auth
- POST /api/auth/register`
- POST /api/auth/login`

### Requests
- GET /api/requests/pending-public?page=1&limit=3`

---

## ⚙️ Environment Variables

Create a `.env` file in the root:


PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
##Deploy to vercel
Import the repo in Vercel

Add env variables

Deploy

