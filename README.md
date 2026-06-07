# Grocery Store Backend API

Complete backend API for Grocery Store E-commerce Application.

## Features

- User Authentication (Register/Login with JWT)
- Product Management (CRUD operations)
- MongoDB Database Integration
- Swagger API Documentation
- JWT Token Authentication
- Admin Role-based Access Control

## Installation

1. Install dependencies:
```bash
npm install
```

## Required Dependencies

The following packages are required:
- express
- mongoose
- bcryptjs
- jsonwebtoken
- cors
- body-parser
- swagger-ui-express
- swagger-jsdoc

## Configuration

### MongoDB Connection
The MongoDB connection is configured in `_core_app_connectivities/db_mongo_mongoose.js`:
- Connection String: `mongodb+srv://Project:A6pyWYW5Hbu7QE9T@cluster0.obxjkz6.mongodb.net`
- Database Name: `Grossery_store` (MongoDB doesn't allow spaces in database names)

### JWT Secret Key
JWT secret key is set in `services/user.service.js`:
- Secret: `A9F7K2M8ZQ4R6X5B`
- Token Expiry: 7 days

## Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server runs on port 6160 by default.

## API Endpoints

### User Endpoints

#### Register User
- **POST** `/api/v1/users/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+1234567890", // optional
    "address": "123 Main Street, City, State, ZIP" // optional
  }
  ```

#### Login User
- **POST** `/api/v1/users/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

### Product Endpoints

#### Get All Products
- **GET** `/api/v1/products`
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 50)
  - `category` (filter by category)
  - `search` (search in name/description)
  - `sort_by` (price_low, price_high, rating, newest)

#### Get Product by ID
- **GET** `/api/v1/products/:product_id`

#### Create Product (Admin Only)
- **POST** `/api/v1/products`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "Product Name",
    "description": "Product description",
    "price": 18,
    "original_price": 24,
    "image": "https://example.com/image.jpg",
    "category": "Snack & Munchies",
    "label": "Sale",
    "stock_quantity": 100
  }
  ```

#### Update Product (Admin Only)
- **PUT** `/api/v1/products/:product_id`
- **Headers:** `Authorization: Bearer <token>`

#### Delete Product (Admin Only)
- **DELETE** `/api/v1/products/:product_id`
- **Headers:** `Authorization: Bearer <token>`

## Product Model Fields

Based on frontend analysis, products include:
- `name` (required)
- `description` (optional)
- `price` (required)
- `original_price` (optional, for discounts)
- `image` (required)
- `category` (required)
- `label` (Sale, Hot, New, or null)
- `discount_percentage` (auto-calculated)
- `rating` (0-5, default: 0)
- `reviews_count` (default: 0)
- `stock_quantity` (default: 0)
- `is_active` (0 or 1, default: 1)

## Swagger Documentation

Access Swagger UI at:
```
http://localhost:6160/api-docs
```

## Response Format

### Success Response
```json
{
  "STATUS": "SUCCESSFUL",
  "ERROR_CODE": "",
  "ERROR_FILTER": "",
  "ERROR_DESCRIPTION": "",
  "DB_DATA": { /* response data */ }
}
```

### Error Response
```json
{
  "STATUS": "ERROR",
  "ERROR_FILTER": "ERROR_CATEGORY",
  "ERROR_CODE": "VTAPP-XXXXX",
  "ERROR_DESCRIPTION": "Error message"
}
```

## Authentication

JWT tokens are required for protected routes. Include token in request header:
```
Authorization: Bearer <your_token>
```

## Testing

1. Register a user:
```bash
POST http://localhost:6160/api/v1/users/register
```

2. Login to get token:
```bash
POST http://localhost:6160/api/v1/users/login
```

3. Use token for protected routes:
```bash
POST http://localhost:6160/api/v1/products
Authorization: Bearer <token>
```

## Project Structure

```
Backend/
├── _core_app_connectivities/  # Database connections
├── controllers/                # Request handlers
├── data_repositories/         # Database operations
├── middlewares/               # Authentication middleware
├── models/                    # Mongoose schemas
├── routes/                    # API routes
├── services/                  # Business logic
├── app.js                     # Main application file
├── swagger.js                 # Swagger configuration
└── package.json               # Dependencies
```

## Notes

- All passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Admin role is required for product creation/update/delete
- Products are soft-deleted (is_active flag)
- Discount percentage is auto-calculated from original_price and price

"# Grocery_Store" 
