# ManufactureIQ ERP — Full MERN Stack Application

A comprehensive Manufacturing ERP system for paper/packaging manufacturing companies. Manages the complete manufacturing lifecycle: procurement → material inward → sales orders → job orders → production → dispatch.

## 🛠 Tech Stack

- **MongoDB** (Mongoose ODM) — database
- **Express.js** — REST API backend
- **React.js** (Vite) — frontend SPA
- **Node.js** — runtime
- **JWT** — authentication
- **ExcelJS** — Excel export
- **Puppeteer** — PDF generation

## 📁 Project Structure

```
.
├── backend/
│   ├── models/              # Mongoose schemas (15+ models)
│   ├── routes/              # Express routers
│   ├── controllers/         # Business logic
│   ├── middleware/          # Auth & RBAC middleware
│   ├── utils/               # Counters, Excel, PDF utilities
│   ├── server.js            # Main server file
│   ├── seed.js              # Database seeding script
│   ├── package.json
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── api/             # Axios API clients
    │   ├── components/      # Reusable UI components
    │   ├── context/         # React context (Auth)
    │   ├── pages/           # Page components
    │   ├── constants.js     # App constants
    │   ├── App.jsx          # Main app component
    │   └── main.jsx         # Entry point
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── .env
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or connection URI)
- npm or yarn

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### 2. Configure Environment Variables

**Backend** (`backend/.env`):
```env
MONGODB_URI=mongodb://localhost:27017/manufactureiq
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed the Database

```bash
cd backend
npm run seed
```

This creates:
- Default admin user (username: `admin`, password: `admin123`)
- Category masters for Raw Materials, Finished Goods, Consumables, Machine Spares
- Default machines (Heidelberg, Komori, Die Cutters, etc.)

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Backend runs at: http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:3000

### 5. Login

Open http://localhost:3000 in your browser and login with:

- **Username:** `admin`
- **Password:** `admin123`

## 🎨 Design System

The application uses a dark theme with the following color palette:

```javascript
{
  bg:       "#0d1117",
  surface:  "#161b22",
  card:     "#1c2128",
  border:   "#30363d",
  accent:   "#f97316",  // Orange - primary action color
  green:    "#22c55e",
  blue:     "#3b82f6",
  yellow:   "#eab308",
  red:      "#ef4444",
  purple:   "#a855f7",
  text:     "#e6edf3",
  muted:    "#8b949e",
  inputBg:  "#0d1117"
}
```

**Fonts:**
- UI: `Syne` (from Google Fonts)
- Numbers/Codes: `JetBrains Mono` (from Google Fonts)

## 📊 Database Models

### Core Models

1. **User** — Authentication & role-based access control
2. **RawMaterialStock** — Raw material inventory
3. **Inward/GRN** — Goods Receipt Notes
4. **SalesOrder** — Sales orders from clients
5. **JobOrder** — Manufacturing job orders with production tracking
6. **PurchaseOrder** — Purchase orders to vendors
7. **Dispatch** — Delivery challans
8. **FGStock** — Finished goods inventory
9. **ConsumableStock** — Consumables inventory

### Master Data Models

10. **ItemMaster** — Item catalog (RM, FG, Consumable, Machine Spare)
11. **CategoryMaster** — Categories for each item type
12. **SizeMaster** — Paper types by category
13. **VendorMaster** — Vendor directory
14. **ClientMaster** — Client directory
15. **MachineMaster** — Machine capacity & scheduling
16. **PrintingDetailMaster** — Printing specifications (auto-saved from JOs)
17. **Counter** — Auto-incrementing IDs (SO-001, JO-001, etc.)

## 🔐 Authentication & Authorization

### User Roles

- **Admin** — Full access to all modules
- **Manager** — Limited management access
- **Operator** — Production data entry
- **Sales** — Sales & client management
- **Production** — Production planning & tracking
- **Store** — Inventory management
- **Viewer** — Read-only access

### Permission System

Each user has:
- `allowedTabs` — Sidebar modules they can see
- `editableTabs` — Modules they can edit (null = admin full access)
- `canEdit(tabId)` — Helper function to check edit permissions

## 🔄 Critical Business Logic

### Job Order Creation

When a Job Order is created:

1. **Auto-deduct Raw Material Stock**
   - Matches by `paperType + gsm + sheetSize`
   - Subtracts `noOfSheets` from quantity

2. **Build Production Schedule**
   - Calculates duration based on machine capacity
   - Assigns sequential start/end dates per process

3. **Save/Update Printing Master**
   - Upserts printing details for item+client combination
   - Shows confirmation if specs differ from existing master

### Production Stage Updates

When production stage is recorded:

1. **Update Stage History** — Logs qty completed/rejected, operator, date
2. **Update Stage Qty Map** — Accumulates total qty per stage
3. **Auto-update JO Status**:
   - `Open` → `In Progress` → `Completed`
   - Marks processes as completed based on qty thresholds
4. **Move to FG Stock** — When all processes complete

### Dispatch Creation

When dispatch is created:

1. **Deduct FG Stock** — Removes dispatched items
2. **Update SO Status**:
   - `Open` → `Dispatched` → `Closed`
   - Tracks partial vs full dispatch

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
```

### Job Orders (Example)
```
GET    /api/job-orders
GET    /api/job-orders/:id
POST   /api/job-orders
PUT    /api/job-orders/:id
DELETE /api/job-orders/:id
POST   /api/job-orders/:id/stage
GET    /api/job-orders/:id/jobcard-pdf
```

**Note:** Additional routes for Sales Orders, Purchase Orders, Inward, Dispatch, Stock, Masters, and Reports need to be implemented following the same pattern as the Job Order controller.

## 🎯 Next Steps to Complete

### Backend

1. **Create remaining controllers:**
   - Sales Orders
   - Purchase Orders
   - Inward/GRN
   - Dispatch
   - Stock management (RM, FG, Consumable)
   - Master data (Vendors, Clients, Items, Machines, etc.)
   - Production records
   - Reports & analytics

2. **Implement routes:**
   - Create route files for each resource
   - Import and mount in `server.js`

3. **Add business logic:**
   - SO → JO linkage
   - PO → GRN reconciliation
   - Stock alerts (below reorder level)
   - Production targets vs actuals

4. **Excel & PDF exports:**
   - Implement export endpoints for all reports
   - Use `utils/excel.js` and `utils/pdf.js` helpers

### Frontend

1. **Create page components:**
   - Dashboard with production metrics
   - Sales Orders (list + form)
   - Job Orders (list + complex form)
   - Production update module
   - Stock management pages
   - Master data CRUD pages
   - Reports & analytics

2. **Implement forms:**
   - Dynamic line items (add/remove rows)
   - Autocomplete for client/vendor/item selection
   - Date pickers
   - Validation

3. **Build UI components:**
   - Table with sorting/filtering
   - Modal dialogs
   - Toast notifications
   - Excel import/export buttons
   - Print-optimized PDF views

4. **Add routing:**
   - React Router for navigation
   - Protected routes
   - 404 page

## 🏭 Key Features (To Be Implemented)

- ✅ JWT Authentication
- ✅ Role-based Access Control
- ✅ Dark Theme UI
- ✅ MongoDB Models with Business Logic
- ✅ Auto-incrementing IDs
- ⏳ Dashboard with Production Reports
- ⏳ Sales Order Management
- ⏳ Job Order Creation with Auto Stock Deduction
- ⏳ Production Tracking & Stage Updates
- ⏳ Material Inward with PO Linking
- ⏳ Dispatch with FG Stock Deduction
- ⏳ Machine Capacity Planning & Scheduling
- ⏳ Excel Import/Export
- ⏳ PDF Generation (Job Cards, Challans, Reports)
- ⏳ Low Stock Alerts
- ⏳ Production vs Target Tracking
- ⏳ Vendor Performance Reports
- ⏳ Global Search

## 🛠 Development Commands

### Backend

```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm run seed     # Seed database with default data
```

### Frontend

```bash
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 📝 Code Style Guidelines

- Use functional React components with hooks
- Follow the existing dark theme color palette
- Keep business logic in backend controllers
- Use Mongoose middleware for auto-calculations
- Add proper error handling and validation
- Write clear, descriptive variable names
- Comment complex business logic

## 🔧 Troubleshooting

### MongoDB Connection Failed

Ensure MongoDB is running:
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 mongo:latest
```

### Port Already in Use

Change ports in `.env` files if 5000 or 3000 are occupied.

### Module Not Found Errors

Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

ISC

---

**Built with ❤️ for Manufacturing Excellence**
