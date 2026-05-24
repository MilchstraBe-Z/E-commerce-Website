# E-commerce Website

A Node.js and MySQL shopping website built for Web Programming and Internet Security. The project implements a product catalogue, category browsing, product detail pages, a client-side shopping cart, account login/registration, an admin panel, and a PayPal sandbox checkout flow with order verification.

The implementation follows the project phases described in `P1_2A.pdf`, `P2B_3.pdf`, `P4.pdf`, `P5.pdf`, and `P6.pdf`. The submitted project summary is documented in `Final Report for IEMS 5718.pdf`.

## Features

- Product listing page with category filtering and breadcrumb navigation.
- Product detail page with image, description, price, quantity selector, and add-to-cart action.
- Shopping cart stored in browser `localStorage`, with quantity updates, item removal, total calculation, and restore-after-refresh behavior.
- User registration, login, logout, and password change.
- Admin-only panel for adding categories, adding products with image uploads, deleting products, and viewing orders.
- PayPal sandbox checkout using Website Payments Standard cart upload fields.
- Server-side order creation with salt and SHA-256 digest generation.
- PayPal IPN/webhook verification, duplicate-order protection, and transaction storage.
- User portal showing account details and the latest five orders.
- Basic web security controls including CSRF tokens, HTTP-only session cookies, CSP headers, password hashing, file upload restrictions, and parameterized SQL queries.

## Tech Stack

- Node.js
- Express.js
- EJS templates
- MySQL
- Vanilla JavaScript
- CSS
- PayPal Sandbox
- PM2 for production process management

## Project Structure

```text
.
|-- public/
|   |-- css/                 # Page stylesheets
|   `-- js/main.js           # Cart, AJAX, admin, and checkout client logic
|-- server/
|   |-- app.js               # Express application entry point
|   |-- database.js          # MySQL connection pool
|   |-- controllers/         # Auth, product, and category handlers
|   |-- models/              # Database access helpers
|   |-- routes/              # API and auth routes
|   `-- views/               # EJS pages
|-- uploads/
|   |-- icons/               # UI icons
|   `-- product_images/      # Product images
|-- package.json
|-- P1_2A.pdf
|-- P2B_3.pdf
|-- P4.pdf
|-- P5.pdf
|-- P6.pdf
`-- Final Report for IEMS 5718.pdf
```

## Requirements

- Node.js 14 or later
- MySQL server
- PayPal sandbox business and buyer accounts, if testing checkout end to end

## Installation

Install dependencies from the project root:

```bash
npm install
```

The current source imports a few packages that are not listed in `package.json`. If the app fails with `Cannot find module ...`, install the missing runtime dependencies:

```bash
npm install express-validator bcrypt cookie-parser csurf xss multer
```

## Database Setup

Create a MySQL database named `shopping_site`.

The application expects tables similar to the following:

```sql
CREATE TABLE categories (
  catid INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

CREATE TABLE products (
  pid INT AUTO_INCREMENT PRIMARY KEY,
  catid INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  FOREIGN KEY (catid) REFERENCES categories(catid)
);

CREATE TABLE users (
  userid INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  admin TINYINT(1) DEFAULT 0
);

CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255),
  salt VARCHAR(255) NOT NULL,
  digest VARCHAR(255) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  paypal_fields TEXT,
  verified TINYINT(1) DEFAULT 0,
  payer_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  pid INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
```

Add at least two categories, at least two products per category, one normal user, and one admin user. Passwords should be stored as bcrypt hashes, matching the login implementation.

## Configuration

Database credentials are currently hardcoded in:

- `server/app.js`
- `server/database.js`

Update the MySQL host, user, password, and database name before running the app locally.

For production, these values should be moved into environment variables instead of being committed in source code.

The PayPal sandbox merchant account and callback URLs are configured in:

- `server/views/cart.ejs`
- `server/app.js`

Update the `business`, `return`, `notify_url`, and merchant email values if deploying under a different domain or sandbox account.

## Running Locally

Start the application from the project root:

```bash
node server/app.js
```

Open:

```text
http://localhost:5000
```

The `package.json` scripts currently point to `app.js` in the project root, while the actual entry point is `server/app.js`. Use the direct command above unless the scripts are updated.

## Main Routes

| Route | Description |
| --- | --- |
| `/` | Product listing and category browsing |
| `/product/:pid` | Product detail page |
| `/cart` | Checkout cart page |
| `/register` | User registration |
| `/login` | User login |
| `/logout` | Logout |
| `/user-portal` | User account and recent orders |
| `/admin` | Admin panel, restricted to admin users |
| `/api/products` | Product API, optional `?catid=` filter |
| `/api/categories` | Category API |
| `/api/create-order` | Creates an order before PayPal submission |
| `/paypal/webhook` | PayPal IPN verification endpoint |
| `/thank-you` | Payment return page |

## Checkout Flow

1. The customer adds products to the cart.
2. Cart data is stored in `localStorage`.
3. On the cart page, the customer selects items to purchase.
4. The browser sends only `pid` and `quantity` values to `/api/create-order`.
5. The server reloads product names and prices from MySQL, calculates the total, creates a random salt, generates a SHA-256 digest, and stores the order.
6. The server returns the PayPal hidden fields, order ID, and digest.
7. The browser clears the local cart and submits the PayPal form.
8. PayPal sends IPN data to `/paypal/webhook`.
9. The server validates PayPal authenticity, regenerates the digest, checks it against the stored order, and records the transaction.
10. Users can view recent purchases in `/user-portal`; admins can view orders in `/admin`.

## Security Notes

Implemented controls include:

- Bcrypt password hashing.
- Express session cookies with `httpOnly`.
- CSRF protection with `csurf`.
- CSP response header.
- EJS output escaping with `<%= ... %>`.
- XSS sanitization for product name and description before rendering.
- SQL queries using parameter placeholders in most database operations.
- Admin route protection through session user and `admin` flag checks.
- Image upload validation by extension, MIME type, and 10 MB size limit.
- `x-powered-by` header disabled.

Before production use, review and improve:

- Move database credentials and session secrets to environment variables.
- Rotate the session ID after login to strengthen session fixation protection.
- Ensure all state-changing admin endpoints enforce admin authentication.
- Avoid template-literal SQL construction.
- Use HTTPS in production and keep `NODE_ENV=production` so secure cookies are enabled.
- Store sessions in a persistent server-side store instead of the default memory store.

## Course Phase Mapping

- Phase 1: Static layout, semantic HTML, CSS product grid, hover cart, product detail pages, and breadcrumb navigation.
- Phase 2A: Secure server deployment on cloud infrastructure.
- Phase 2B: MySQL-backed categories/products and admin product/category management.
- Phase 3: AJAX/localStorage shopping cart with dynamic quantity and total updates.
- Phase 4: Authentication, admin protection, CSRF/XSS/SQL injection mitigations, session cookies, CSP, logout, and password change.
- Phase 5: Secure PayPal checkout, order digest generation, IPN validation, admin order display, and user order history.
- Phase 6: Extension options are documented in `P6.pdf`; this project includes a member portal with recent order history.

## Reference Documents

- `P1_2A.pdf`: Phase 1 layout and Phase 2A secure server setup requirements.
- `P2B_3.pdf`: Phase 2B data management and Phase 3 AJAX shopping cart requirements.
- `P4.pdf`: Phase 4 website security requirements.
- `P5.pdf`: Phase 5 secure checkout requirements.
- `P6.pdf`: Phase 6 extension requirements.
- `Final Report for IEMS 5718.pdf`: Final implementation report and screenshots.
