# Quick Start Guide

Get ManufactureIQ ERP running in 5 minutes!

## ⚡ Prerequisites

- **Node.js** (v18+) — Download from [nodejs.org](https://nodejs.org)
- **MongoDB** — Install locally or use Docker:
  ```bash
  docker run -d -p 27017:27017 mongo:latest
  ```

## 🚀 Setup Steps

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 3. Seed Database

```bash
cd ../backend
npm run seed
```

You should see:
```
✓ Created default admin user (username: admin, password: admin123)
✓ Seeded category masters
✓ Seeded default machines
✅ Database seeding completed successfully!
```

### 4. Start Backend Server

```bash
npm run dev
```

You should see:
```
🚀 ManufactureIQ ERP Backend
📡 Server running on port 5000
🌍 Environment: development
🔗 API: http://localhost:5000/api
```

### 5. Start Frontend (New Terminal)

```bash
cd ../frontend
npm run dev
```

You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:3000/
```

### 6. Open Browser

Visit: **http://localhost:3000**

Login with:
- Username: `admin`
- Password: `admin123`

## ✅ You're Done!

You should now see the ManufactureIQ ERP dashboard with:
- Dark theme interface
- Sidebar navigation
- User info & logout button
- Module placeholders

## 🔧 Next Steps

The foundation is complete! Now you need to:

1. **Implement remaining backend routes** (see `backend/controllers/jobOrderController.js` as example)
2. **Create frontend page components** (see `frontend/src/App.jsx` for structure)
3. **Add business logic** for each module
4. **Integrate Excel/PDF exports**

Refer to the main **README.md** for detailed implementation guides.

## ❓ Troubleshooting

### "Connection refused" error
- Make sure MongoDB is running
- Check `backend/.env` has correct `MONGODB_URI`

### "Port already in use"
- Stop other applications using ports 3000 or 5000
- Or change ports in `.env` files

### Missing modules
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Key Files to Explore

- `backend/models/` — Database schemas
- `backend/controllers/jobOrderController.js` — Complex business logic example
- `frontend/src/App.jsx` — Main application structure
- `frontend/src/context/AuthContext.jsx` — Authentication management

Happy coding! 🎉
