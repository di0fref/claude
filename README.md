# Bale Delivery Tracker

A full-stack web application for tracking hay bale deliveries and their lifecycle status. Built with React, Express.js, Sequelize, and SQLite.

## Features

### Core Functionality
- **Delivery Management**: Create, view, and manage deliveries with supplier information, dates, and invoice details
- **Automatic Bale Creation**: When a delivery is added, all associated bales are automatically created
- **Bale Status Tracking**: Track multiple statuses for each bale:
  - Open/Closed (mutually exclusive)
  - Bad (can be combined with other statuses)
  - Reimbursed (can be combined with other statuses)
- **Inline Date Editing**: All dates (opened, closed, warm) are editable inline in the bales view
- **Time Tracking**: Automatic counter from when bale was opened until closed (or current time if still open)
- **Warning System**: Configurable warnings for bales open too long (7 days winter, 5 days summer by default)
- **Cost Prediction**: 6-month cost projection based on currently open bales
- **User Management**: Admin users can create users and assign roles (admin/regular)
- **Authentication**: JWT-based authentication with password hashing
- **Fully Responsive**: Tables convert to cards on small devices, no horizontal scrolling

### User Roles
- **Admin**: Can manage users, deliveries, and bales
- **Regular**: Can manage deliveries and bales

## Tech Stack

### Backend
- Node.js & Express.js
- Sequelize ORM
- SQLite database
- bcryptjs for password hashing
- JWT for authentication
- Auto-migrations with Sequelize

### Frontend
- React 18
- React Router for navigation
- Axios for API calls
- TailwindCSS for styling
- Responsive design (mobile-first)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. **Install dependencies for both backend and frontend:**

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

2. **Set up environment variables:**

The `.env` file is already created with default values. For production, update the JWT_SECRET:

```
PORT=5000
JWT_SECRET=your_secure_secret_key_here
NODE_ENV=development
```

3. **Run database migrations and seed:**

```bash
npm run migrate
npm run seed
```

This will:
- Create the database schema
- Add a default admin user (username: `admin`, password: `admin123`)
- Set default warning settings (7 days winter, 5 days summer)

## Running the Application

### Development Mode (Both servers concurrently)

```bash
npm run dev
```

This starts:
- Backend API server on http://localhost:5000
- Frontend React app on http://localhost:3000

### Backend Only

```bash
npm run server
```

### Frontend Only

```bash
npm run client
```

## Default Login Credentials

**Username:** admin
**Password:** admin123

**Important:** Change the default admin password after first login by creating a new admin user and deleting the default one.

## Project Structure

```
claude/
├── backend/
│   ├── config/
│   │   └── config.json           # Database configuration
│   ├── controllers/              # Business logic
│   │   ├── authController.js
│   │   ├── baleController.js
│   │   ├── deliveryController.js
│   │   └── userController.js
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   ├── migrations/               # Sequelize migrations
│   ├── models/                   # Sequelize models
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Delivery.js
│   │   ├── Bale.js
│   │   └── Setting.js
│   ├── routes/                   # API routes
│   │   ├── auth.js
│   │   ├── bales.js
│   │   ├── deliveries.js
│   │   └── users.js
│   ├── seeders/                  # Database seeders
│   └── server.js                 # Express server
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── CostPrediction.jsx
│   │   │   ├── InlineEdit.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.js        # Authentication hook
│   │   ├── pages/                # Page components
│   │   │   ├── Bales.jsx
│   │   │   ├── Deliveries.jsx
│   │   │   ├── Login.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── services/
│   │   │   └── api.js            # API client
│   │   ├── utils/
│   │   │   └── dateUtils.js      # Date utilities
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── .env
├── .gitignore
├── package.json
├── README.md
└── specifications.txt
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user role
- `DELETE /api/users/:id` - Delete user

### Deliveries
- `GET /api/deliveries` - Get all deliveries with bale stats
- `GET /api/deliveries/:id` - Get delivery by ID with bales
- `POST /api/deliveries` - Create new delivery (auto-creates bales)
- `PUT /api/deliveries/:id` - Update delivery
- `DELETE /api/deliveries/:id` - Delete delivery (cascades to bales)

### Bales
- `GET /api/bales` - Get all bales
- `GET /api/bales/delivery/:deliveryId` - Get bales for specific delivery
- `PUT /api/bales/:id/status` - Update bale status
- `PUT /api/bales/:id/dates` - Update bale dates
- `GET /api/bales/settings` - Get warning settings
- `PUT /api/bales/settings` - Update warning settings (admin only)

## Usage Guide

### Adding a Delivery

1. Navigate to the Deliveries page
2. Click "+ Add Delivery"
3. Fill in:
   - Supplier name
   - Delivery date
   - Invoice number (optional)
   - Number of bales
   - Payment status
4. Click "Create"
5. All bales for the delivery are automatically created

### Managing Bales

1. Click on a delivery to view its bales
2. Toggle status badges (Open, Closed, Reimbursed, Bad)
3. Click on dates to edit them inline
4. View time elapsed for open bales
5. Warning colors:
   - Yellow: Approaching warning threshold
   - Red: Exceeded warning threshold

### Viewing Cost Predictions

1. Go to Deliveries page
2. Click "Cost Prediction" button
3. Adjust cost per bale per day
4. View 6-month projection based on currently open bales

### Managing Users (Admin Only)

1. Navigate to Users page
2. Click "+ Add User"
3. Enter username, password, and role
4. Manage existing users' roles
5. Delete users as needed

## Business Rules

1. A bale **cannot** be both open and closed simultaneously
2. A bale **can** be bad and reimbursed while also being open or closed
3. When marking a bale as open, the opened date is automatically set
4. When marking a bale as closed, the closed date is automatically set
5. Time tracking only shows for bales that have an opened date
6. Time tracking is "locked" (shows elapsed time) when a bale is closed
7. Warning thresholds are configurable and apply based on season (winter/summer)

## Database Schema

### Users
- id, username, password, role, timestamps

### Deliveries
- id, supplier, delivery_date, invoice_number, number_of_bales, payment_status, timestamps

### Bales
- id, delivery_id (FK), is_open, is_closed, is_reimbursed, is_bad, opened_date, closed_date, warm_date, timestamps

### Settings
- id, key, value, timestamps

## Development Notes

- SQLite database file is created as `backend/database.sqlite`
- Migrations are run automatically on `npm run migrate`
- Server uses nodemon for auto-restart during development
- Frontend proxies API requests to backend during development
- All passwords are hashed using bcryptjs with salt rounds of 10
- JWT tokens expire after 24 hours

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Update `JWT_SECRET` to a secure random string
3. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
4. Serve the built frontend files from Express
5. Use a process manager like PM2 to run the server
6. Consider using a reverse proxy (nginx) for SSL termination

## Troubleshooting

### Database Issues
- Delete `backend/database.sqlite` and run migrations again
- Check that migrations completed successfully

### Port Conflicts
- Change PORT in `.env` if 5000 is already in use
- Update proxy in `frontend/package.json` if backend port changes

### Authentication Issues
- Clear browser localStorage
- Check that JWT_SECRET is set correctly
- Verify token expiration settings

## Contributing

This is a custom internal application. For issues or feature requests, contact the development team.

## License

Proprietary - Internal Use Only
