# Shop

A simple online store with an admin panel, product mangement, shopping cart and stripe checkout

## Features

- Product catalog with filtering, sorting, and search
- Shopping cart with persistent storage (localStorage)
- Stripe payment integration (test mode)
- Admin panel with JWT authentication
- Add, edit, and delete products (admin only)
- Light/dark theme toggle
- Responsive design

### Prerequisites

- Node.js
- npm
- MongoDB (local or remote)

### Installation


`npm install`

### Usage

1. Start MongoDB locally (or update connection string in `server.js`)
2. Start the server: `node server.js`
3. For development with auto-reload: `npm run devStart`
4. Open your browser and go to: [http://localhost:3000](http://localhost:3000)

### Default Admin Login

- **Username:** user
- **Password:** pass

## Project Structure

- `server.js` – Express server and API endpoints
- `models/` – Mongoose models (`Item.js`, `Admin.js`, `Log.js`)
- `public/` – Static frontend (HTML, CSS, JS)
- `package.json` – Project dependencies and scripts

## API Endpoints

- `GET /api/items` – List all products
- `POST /api/checkout` – Create Stripe checkout session
- `POST /api/admin/login` – Admin login (returns JWT)
- `POST /api/admin/items` – Add product (admin, JWT required)
- `PUT /api/admin/items/:id` – Edit product (admin, JWT required)
- `DELETE /api/admin/items/:id` – Delete product (admin, JWT required)

---

**Note:**  
- Stripe is in test mode by default 
- Change admin credentials in the database for production
- For demo, a test admin user is auto created on first run