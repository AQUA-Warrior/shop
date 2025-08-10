# Shop

A simple online store with Printify integration for product catalog and order management

## Features

- Product catalog from Printify (filtering, sorting, search)
- Shopping cart with persistent storage (localStorage)
- Stripe payment integration (test mode)
- Light/dark theme toggle
- Responsive design

### Prerequisites

- Node.js
- npm
- Printify account and API token

### Installation

`npm install`

### Usage

1. Copy `.env.example` to `.env` and fill in your secrets
3. Start the server: `node server.js`
4. For development with auto reload: `npm run devStart`
5. Open your browser and go to: [http://localhost:3000](http://localhost:3000)

## API Endpoints (Printify)

- `GET /api/items` – List all products (from Printify)
- `POST /api/checkout` – Create Printify order

---

**Note:**  
- All products and orders are managed via Printify API  
- There is no admin panel - manage products directly in Printify  