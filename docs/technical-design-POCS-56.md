# Technical Design: POCS-56 - Cart API Lambda Functions

## Executive Summary
Enhance existing cart API Lambda functions to implement product validation, stock availability checks, concurrent write safety using DynamoDB conditional expressions, and product detail enrichment. The design follows existing patterns while adding critical data integrity and consistency features required for production readiness.

## Project Context
- **Project:** order-poc (Cricket Equipment Order Portal)
- **Ticket:** POCS-56 - Implement cart API Lambda functions (add, remove, update, get)
- **Parent Epic:** POCS-32 - Shopping Cart
- **Objective:** Implement robust cart management with product validation, stock checks, and concurrent operation safety
- **Tech Stack:** Node.js 20.x (TypeScript), AWS Lambda, DynamoDB, API Gateway, Cognito, SAM
- **Team:** Backend development team familiar with DynamoDB and serverless patterns
- **Timeline:** Sprint development (estimated 3-5 days)
- **Scale:** Expected 1000+ concurrent users at peak
- **Budget:** Serverless on-demand pricing (Lambda + DynamoDB PAY_PER_REQUEST)
- **Constraints:**
  - Must use existing DynamoDB table schema (single-table design)
  - Must maintain backward compatibility with existing cart functionality
  - 30-second Lambda timeout
  - API Gateway 29-second timeout

## Requirements & Assumptions

### Functional Requirements
1. **GET /cart** - Retrieve user's cart with enriched product details from Products table
2. **POST /cart** - Add item to cart with product validation and stock checking
3. **PUT /cart/{productId}** - Update item quantity with stock validation
4. **DELETE /cart/{productId}** - Remove specific item from cart
5. All endpoints require JWT authentication via Cognito authorizer
6. Concurrent cart operations must be handled safely

### Non-Functional Requirements
1. **Data Integrity** - Product validation, stock checks, conditional writes
2. **Performance** - Sub-500ms p95 latency for cart operations
3. **Consistency** - Optimistic locking for concurrent writes
4. **Reliability** - Graceful handling of product unavailability
5. **Observability** - Structured logging for all operations

### Assumptions
- Products table contains current, accurate product information
- Stock quantities in Products table are authoritative
- Cart items store a snapshot of price at add-time (for price change detection)
- Currency is consistently USD across all products
- Product deletion/deactivation should not block cart operations (graceful degradation)
- Cart has no expiration (persists until explicitly cleared or checked out)
- Maximum cart size: 50 items (soft limit, can be enforced via validation)

### Non-Goals (Out of Scope)
- Cart expiration/TTL
- Cart sharing between users
- Saved carts or wishlists
- Price change notifications
- Automatic stock reservation
- Multi-currency support

## Current State Analysis

### Existing Implementation
The current cart implementation (in `/src/functions/cart/`) provides basic CRUD operations but lacks several critical features:

**Files:**
- `/src/functions/cart/handler.ts` - Lambda handler routing
- `/src/functions/cart/services/cart.service.ts` - DynamoDB operations
- `/src/functions/cart/types.ts` - TypeScript interfaces

**Current API Endpoints:**
- `GET /cart` - Returns cart items
- `POST /cart/items` - Adds item (accepts full product details in request)
- `PUT /cart/items/{itemId}` - Updates quantity by itemId
- `DELETE /cart/items/{itemId}` - Removes item by itemId
- `DELETE /cart` - Clears entire cart

**Current Data Model:**
```typescript
CartEntity {
  PK: `USER#${userId}`  // Partition Key
  SK: 'CART'            // Sort Key
  userId: string
  items: CartItem[]     // Array of items in cart
  totalAmount: number
  currency: string
  createdAt: string
  updatedAt: string
}

CartItem {
  itemId: string        // UUID for the cart item
  productId: string     // Reference to product
  productName: string   // Snapshot of name
  price: number         // Snapshot of price
  quantity: number
  subtotal: number      // price * quantity
}
```

### Pain Points & Gaps
1. **No Product Validation** - Accepts any productId without verifying existence
2. **No Stock Validation** - Doesn't check product stock availability
3. **No Concurrent Write Safety** - Uses unconditional PutCommand (race conditions possible)
4. **API Path Mismatch** - Uses `/cart/items/{itemId}` vs required `/cart/{productId}`
5. **No Product Detail Enrichment** - GET /cart doesn't join with Products table
6. **Client Provides Product Details** - POST /cart/items requires productName and price in request (security risk)
7. **Uses itemId Instead of productId** - Updates/deletes use internal itemId, not productId

### Required Changes
1. Change API paths from `/cart/items/{itemId}` to `/cart/{productId}` (breaking change)
2. Add product validation service integration
3. Add stock availability checking
4. Implement conditional writes using version attribute
5. Enrich GET /cart response with current product details
6. Remove product details from POST request body (fetch from Products table)
7. Add error handling for out-of-stock scenarios
8. Add error handling for deleted/inactive products

## Proposed Design

### System Architecture

```
┌─────────────────┐
│   API Gateway   │
│   + Cognito     │
│   Authorizer    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cart Lambda    │
│   (handler.ts)  │
└────────┬────────┘
         │
         ├──────────┬──────────────┐
         ▼          ▼              ▼
┌────────────┐ ┌──────────┐ ┌────────────┐
│   Cart     │ │ Products │ │ Response   │
│  Service   │ │ Service  │ │   Utils    │
└─────┬──────┘ └─────┬────┘ └────────────┘
      │              │
      ▼              ▼
┌────────────────────────┐
│   DynamoDB Tables      │
│  - Carts (PK: USER#id) │
│  - Products (PK: PROD#)│
└────────────────────────┘
```

**Data Flow for POST /cart:**
1. API Gateway validates JWT → extracts userId
2. Lambda handler parses request (productId, quantity)
3. Validates request body (productId required, quantity > 0)
4. **ProductsService.getProductById()** - Fetch product details
5. Validate product exists and is active
6. Validate stock availability (quantity <= stock)
7. **CartService.getCart()** - Fetch current cart with version
8. Add/update item in cart (merge if productId exists)
9. **CartService.saveCart()** - Conditional write with version check
10. Return updated cart response

### Key Components

#### 1. Cart Lambda Handler
**Purpose:** Route requests and orchestrate cart operations
**Technology:** TypeScript Lambda function with API Gateway proxy integration
**File:** `/src/functions/cart/handler.ts`
**Responsibilities:**
- Extract userId from JWT claims
- Route requests by HTTP method and path
- Validate authentication
- Call appropriate service methods
- Handle errors and return standardized responses

**Key Changes:**
- Update path matching for `/cart/{productId}` instead of `/cart/items/{itemId}`
- Add product validation before cart operations
- Add stock validation for add/update operations
- Handle concurrent write conflicts (retry logic)

#### 2. Cart Service
**Purpose:** DynamoDB operations for cart management
**Technology:** AWS SDK v3 DynamoDB Document Client
**File:** `/src/functions/cart/services/cart.service.ts`
**Responsibilities:**
- CRUD operations on Carts table
- Implement optimistic locking with version attribute
- Calculate cart totals
- Merge duplicate productIds

**Key Methods:**
```typescript
async getCart(userId: string): Promise<CartEntity | null>
async saveCart(cart: CartEntity, expectedVersion?: number): Promise<CartEntity>
async deleteCart(userId: string): Promise<void>
```

**New Features:**
- Add `version` attribute to CartEntity for optimistic locking
- Implement conditional writes using `ConditionExpression`
- Retry logic for concurrent write conflicts (max 3 retries)

#### 3. Products Service Integration
**Purpose:** Validate products and check stock
**Technology:** Shared service from products function
**File:** `/src/functions/products/services/products.service.ts` (existing)
**Responsibilities:**
- Fetch product details by productId
- Validate product existence and status
- Check stock availability

**Usage in Cart Lambda:**
```typescript
import { ProductsService } from '../products/services/products.service';

const productsService = new ProductsService();
const product = await productsService.getProductById(productId);

if (!product) {
  throw new NotFoundError('Product not found');
}

if (product.status !== 'active') {
  throw new ValidationError('Product is not available');
}

if (product.stock < quantity) {
  throw new ValidationError('Insufficient stock available', {
    available: product.stock,
    requested: quantity
  });
}
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Lambda Runtime | Node.js 20.x | Existing standard, TypeScript support |
| Language | TypeScript | Type safety, existing codebase standard |
| Build Tool | esbuild (via SAM) | Fast bundling, existing SAM configuration |
| API Gateway | REST API | Existing infrastructure |
| Authentication | Cognito JWT | Existing authorizer configuration |
| Database | DynamoDB | Existing tables, single-table design |
| Client | AWS SDK v3 | Modular, tree-shakable, existing usage |
| Validation | Custom utils | Existing validation framework |
| Error Handling | Custom error classes | Existing error handling pattern |

**No Complex Decisions Required** - All technology choices follow existing patterns in the codebase.

### Data Model

#### CartEntity (Updated Schema)
```typescript
interface CartEntity extends BaseEntity {
  PK: `USER#${string}`;      // Partition Key
  SK: 'CART';                 // Sort Key
  userId: string;             // User ID from Cognito
  items: CartItem[];          // Array of cart items
  totalAmount: number;        // Sum of all item subtotals
  currency: string;           // 'USD'
  version: number;            // NEW: Optimistic locking version
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
}

interface CartItem {
  itemId: string;             // UUID for cart item (internal)
  productId: string;          // Reference to product
  productName: string;        // Snapshot at add-time
  price: number;              // Snapshot at add-time
  quantity: number;           // Requested quantity
  subtotal: number;           // price * quantity
}
```

**Key Changes:**
- Add `version` attribute for optimistic locking
- Keep price/name snapshots (intentional - tracks price at add-time)

#### DynamoDB Access Patterns

| Operation | Access Pattern | Index |
|-----------|---------------|-------|
| Get user cart | GetItem: PK=`USER#${userId}`, SK=`CART` | Primary Key |
| Save cart | PutItem with condition: `version = :expectedVersion` | Primary Key |
| Delete cart | DeleteItem: PK=`USER#${userId}`, SK=`CART` | Primary Key |
| Get product | GetItem: PK=`PRODUCT#${productId}`, SK=`DETAILS` | Primary Key |

**Concurrent Write Safety:**
```typescript
// Use condition expression to ensure version matches
await docClient.send(
  new PutCommand({
    TableName: TABLE_NAME,
    Item: { ...cart, version: currentVersion + 1 },
    ConditionExpression: 'attribute_not_exists(version) OR version = :expectedVersion',
    ExpressionAttributeValues: {
      ':expectedVersion': currentVersion,
    },
  })
);
```

### API Design

#### Common Response Format
```typescript
// Success Response
{
  "success": true,
  "data": { /* response payload */ },
  "timestamp": "2026-02-08T10:30:00.000Z"
}

// Error Response
{
  "message": "Error message",
  "code": "ERROR_CODE",
  "details": { /* additional context */ }
}
```

#### 1. GET /cart

**Description:** Retrieve user's cart with enriched product details

**Request:**
```http
GET /cart HTTP/1.1
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {
        "itemId": "cart-item-uuid-1",
        "productId": "prod-123",
        "productName": "Cricket Bat - Pro Series",
        "price": 299.99,
        "quantity": 2,
        "subtotal": 599.98,
        "currentProduct": {
          "name": "Cricket Bat - Pro Series",
          "price": 299.99,
          "stock": 15,
          "status": "active",
          "imageUrl": "https://cdn.../bat.jpg"
        }
      }
    ],
    "totalAmount": 599.98,
    "currency": "USD",
    "itemCount": 1,
    "updatedAt": "2026-02-08T10:30:00.000Z"
  },
  "timestamp": "2026-02-08T10:30:00.000Z"
}
```

**Response (200 OK - Empty Cart):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [],
    "totalAmount": 0,
    "currency": "USD",
    "itemCount": 0,
    "updatedAt": "2026-02-08T10:30:00.000Z"
  },
  "timestamp": "2026-02-08T10:30:00.000Z"
}
```

**Business Logic:**
1. Get cart from DynamoDB by userId
2. For each item, fetch current product details from Products table
3. If product not found or inactive, mark with `currentProduct: null`
4. Calculate item count
5. Return enriched cart

**Error Responses:**
- `401 UNAUTHORIZED` - Missing or invalid JWT token

#### 2. POST /cart

**Description:** Add item to cart or increment quantity if already exists

**Request:**
```http
POST /cart HTTP/1.1
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "productId": "prod-123",
  "quantity": 2
}
```

**Request Validation:**
- `productId`: required, non-empty string
- `quantity`: required, integer, min: 1, max: 99

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {
        "itemId": "cart-item-uuid-1",
        "productId": "prod-123",
        "productName": "Cricket Bat - Pro Series",
        "price": 299.99,
        "quantity": 2,
        "subtotal": 599.98
      }
    ],
    "totalAmount": 599.98,
    "currency": "USD",
    "itemCount": 1,
    "updatedAt": "2026-02-08T10:30:00.000Z"
  },
  "timestamp": "2026-02-08T10:30:00.000Z"
}
```

**Business Logic:**
1. Validate request body (productId, quantity)
2. Fetch product from Products table
3. Validate product exists and status is 'active'
4. Validate stock availability (product.stock >= quantity)
5. Get current cart
6. Check if productId already in cart:
   - If yes: Add quantity to existing item (validate total <= stock)
   - If no: Create new CartItem with uuid
7. Snapshot product name and price
8. Recalculate subtotals and totalAmount
9. Save cart with conditional write (version check)
10. Retry on version conflict (max 3 times)
11. Return updated cart

**Error Responses:**
- `400 VALIDATION_ERROR` - Invalid request body
- `404 NOT_FOUND` - Product not found
- `400 VALIDATION_ERROR` - Product not available (inactive/out_of_stock status)
- `400 VALIDATION_ERROR` - Insufficient stock (include available quantity in details)
- `401 UNAUTHORIZED` - Missing or invalid JWT
- `409 CONFLICT` - Concurrent update conflict (after retries)
- `500 INTERNAL_SERVER_ERROR` - Unexpected error

#### 3. PUT /cart/{productId}

**Description:** Update quantity for specific product in cart

**Request:**
```http
PUT /cart/prod-123 HTTP/1.1
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "quantity": 5
}
```

**Request Validation:**
- `productId` (path parameter): required, non-empty string
- `quantity`: required, integer, min: 0, max: 99
- `quantity: 0` means remove item

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {
        "itemId": "cart-item-uuid-1",
        "productId": "prod-123",
        "productName": "Cricket Bat - Pro Series",
        "price": 299.99,
        "quantity": 5,
        "subtotal": 1499.95
      }
    ],
    "totalAmount": 1499.95,
    "currency": "USD",
    "itemCount": 1,
    "updatedAt": "2026-02-08T10:35:00.000Z"
  },
  "timestamp": "2026-02-08T10:35:00.000Z"
}
```

**Business Logic:**
1. Validate request body (quantity)
2. Get current cart
3. Find item by productId in cart
4. If not found, throw NOT_FOUND error
5. If quantity === 0:
   - Remove item from cart.items array
6. If quantity > 0:
   - Fetch product from Products table
   - Validate product exists and is active
   - Validate stock availability (product.stock >= quantity)
   - Update item quantity
   - Recalculate subtotal
7. Recalculate totalAmount
8. Save cart with conditional write (version check)
9. Return updated cart

**Error Responses:**
- `400 VALIDATION_ERROR` - Invalid quantity
- `404 NOT_FOUND` - Product not in cart
- `404 NOT_FOUND` - Product no longer exists (for quantity > 0)
- `400 VALIDATION_ERROR` - Insufficient stock
- `401 UNAUTHORIZED` - Missing or invalid JWT
- `409 CONFLICT` - Concurrent update conflict
- `500 INTERNAL_SERVER_ERROR` - Unexpected error

#### 4. DELETE /cart/{productId}

**Description:** Remove specific item from cart

**Request:**
```http
DELETE /cart/prod-123 HTTP/1.1
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [],
    "totalAmount": 0,
    "currency": "USD",
    "itemCount": 0,
    "updatedAt": "2026-02-08T10:40:00.000Z"
  },
  "timestamp": "2026-02-08T10:40:00.000Z"
}
```

**Business Logic:**
1. Get current cart
2. Find item by productId
3. If not found, throw NOT_FOUND error
4. Remove item from cart.items array
5. Recalculate totalAmount
6. Save cart with conditional write (version check)
7. Return updated cart

**Error Responses:**
- `404 NOT_FOUND` - Product not in cart
- `401 UNAUTHORIZED` - Missing or invalid JWT
- `409 CONFLICT` - Concurrent update conflict
- `500 INTERNAL_SERVER_ERROR` - Unexpected error

#### 5. DELETE /cart (Existing - No Changes)

**Description:** Clear entire cart

**Request:**
```http
DELETE /cart HTTP/1.1
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Cart cleared successfully"
  },
  "timestamp": "2026-02-08T10:45:00.000Z"
}
```

**Business Logic:**
1. Delete cart item from DynamoDB
2. Return success message

### Error Handling

#### Error Types & HTTP Status Codes

| Error Scenario | Error Class | HTTP Status | Code |
|----------------|-------------|-------------|------|
| Missing productId or quantity | ValidationError | 400 | VALIDATION_ERROR |
| Invalid quantity (< 0 or > 99) | ValidationError | 400 | VALIDATION_ERROR |
| Product not found | NotFoundError | 404 | NOT_FOUND |
| Product inactive/unavailable | ValidationError | 400 | VALIDATION_ERROR |
| Insufficient stock | ValidationError | 400 | INSUFFICIENT_STOCK |
| Item not in cart | NotFoundError | 404 | NOT_FOUND |
| Missing JWT token | UnauthorizedError | 401 | UNAUTHORIZED |
| Concurrent update conflict | ConflictError | 409 | CONFLICT |
| DynamoDB error | InternalServerError | 500 | INTERNAL_SERVER_ERROR |
| Unexpected error | InternalServerError | 500 | INTERNAL_SERVER_ERROR |

#### Error Response Format

```typescript
interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}
```

**Examples:**

```json
// Insufficient Stock
{
  "message": "Insufficient stock available",
  "code": "INSUFFICIENT_STOCK",
  "details": {
    "requested": 10,
    "available": 5,
    "productId": "prod-123"
  }
}

// Product Not Found
{
  "message": "Product not found",
  "code": "NOT_FOUND"
}

// Validation Error
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      "Field 'quantity' must be at least 1"
    ]
  }
}
```

#### Concurrent Write Handling

**Strategy:** Optimistic Locking with Retry

```typescript
async function saveCartWithRetry(
  cart: CartEntity,
  maxRetries: number = 3
): Promise<CartEntity> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await cartService.saveCart(cart, cart.version);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        attempt++;

        if (attempt >= maxRetries) {
          throw new ConflictError(
            'Cart was modified by another request. Please retry.',
            { attempts: attempt }
          );
        }

        // Fetch latest cart and retry
        const latestCart = await cartService.getCart(cart.userId);
        if (!latestCart) {
          // Cart was deleted, start fresh
          cart.version = 0;
        } else {
          // Merge changes with latest version
          cart = mergeCartChanges(cart, latestCart);
        }

        // Exponential backoff
        await sleep(100 * Math.pow(2, attempt));
        continue;
      }

      throw error;
    }
  }

  throw new ConflictError('Max retry attempts reached');
}
```

**Retry Logic:**
1. Attempt conditional write
2. If `ConditionalCheckFailedException`, refetch latest cart
3. Merge changes (re-apply the operation to latest cart state)
4. Retry with exponential backoff (100ms, 200ms, 400ms)
5. Max 3 attempts, then throw ConflictError

### Validation Logic

#### Request Body Validation

Using existing validation utility:

```typescript
// POST /cart
validateRequestBody(body, [
  { field: 'productId', required: true, type: 'string', minLength: 1 },
  { field: 'quantity', required: true, type: 'number', min: 1, max: 99 },
]);

// PUT /cart/{productId}
validateRequestBody(body, [
  { field: 'quantity', required: true, type: 'number', min: 0, max: 99 },
]);
```

#### Product Validation

```typescript
async function validateProduct(
  productId: string,
  quantity: number
): Promise<ProductEntity> {
  const product = await productsService.getProductById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.status !== 'active') {
    throw new ValidationError(`Product is ${product.status}`, {
      productId,
      status: product.status,
    });
  }

  if (product.stock < quantity) {
    throw new ValidationError('Insufficient stock available', {
      productId,
      requested: quantity,
      available: product.stock,
    });
  }

  return product;
}
```

#### Cart Size Validation (Optional Enhancement)

```typescript
const MAX_CART_ITEMS = 50;

if (cart.items.length >= MAX_CART_ITEMS) {
  throw new ValidationError(`Cart cannot exceed ${MAX_CART_ITEMS} items`);
}
```

### SAM Template Updates

**Changes to `/template.yaml`:**

```yaml
# EXISTING CartFunction - Update paths only
CartFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: !Sub OrderPOC-Cart-${Environment}
    CodeUri: src/
    Handler: functions/cart/handler.handler
    Description: Shopping cart management
    Environment:
      Variables:
        CARTS_TABLE: !Ref CartsTable
        PRODUCTS_TABLE: !Ref ProductsTable  # ADD THIS
        PRODUCTS_CATEGORY_INDEX: category-price-index  # ADD THIS
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref CartsTable
      - DynamoDBCrudPolicy:  # ADD THIS
          TableName: !Ref ProductsTable
    Events:
      GetCart:
        Type: Api
        Properties:
          RestApiId: !Ref OrderApi
          Path: /cart
          Method: GET
      AddToCart:  # UPDATE EVENT NAME
        Type: Api
        Properties:
          RestApiId: !Ref OrderApi
          Path: /cart  # CHANGED FROM /cart/items
          Method: POST
      UpdateCartItem:  # UPDATE EVENT NAME
        Type: Api
        Properties:
          RestApiId: !Ref OrderApi
          Path: /cart/{productId}  # CHANGED FROM /cart/items/{itemId}
          Method: PUT
      RemoveCartItem:  # UPDATE EVENT NAME
        Type: Api
        Properties:
          RestApiId: !Ref OrderApi
          Path: /cart/{productId}  # CHANGED FROM /cart/items/{itemId}
          Method: DELETE
      ClearCart:
        Type: Api
        Properties:
          RestApiId: !Ref OrderApi
          Path: /cart
          Method: DELETE
  Metadata:
    BuildMethod: esbuild
    BuildProperties:
      Minify: true
      Target: es2020
      EntryPoints:
        - functions/cart/handler.ts
      External:
        - '@aws-sdk/*'
```

**Key Changes:**
1. Add `PRODUCTS_TABLE` and `PRODUCTS_CATEGORY_INDEX` environment variables
2. Add DynamoDB read policy for Products table
3. Update API Gateway event paths from `/cart/items/{itemId}` to `/cart/{productId}`
4. Keep existing `DELETE /cart` for clearing cart

### File Structure

```
src/
├── functions/
│   ├── cart/
│   │   ├── handler.ts              # UPDATE: New routing logic
│   │   ├── types.ts                # UPDATE: Add version to CartEntity
│   │   ├── services/
│   │   │   └── cart.service.ts     # UPDATE: Add optimistic locking
│   │   └── utils/
│   │       ├── validation.ts       # NEW: Product validation helpers
│   │       └── retry.ts            # NEW: Retry logic for conflicts
│   └── products/
│       └── services/
│           └── products.service.ts # EXISTING: Reuse for product validation
└── shared/
    ├── types/
    │   └── dynamodb.types.ts       # UPDATE: Add version to CartEntity
    └── utils/
        ├── error.util.ts           # EXISTING: Use ConflictError
        └── validation.util.ts      # EXISTING: Use existing validators
```

**New Files:**
1. `/src/functions/cart/utils/validation.ts` - Product validation helpers
2. `/src/functions/cart/utils/retry.ts` - Retry logic for concurrent writes

**Modified Files:**
1. `/src/functions/cart/handler.ts` - Update routing, add validation
2. `/src/functions/cart/services/cart.service.ts` - Add optimistic locking
3. `/src/functions/cart/types.ts` - Add version attribute
4. `/src/shared/types/dynamodb.types.ts` - Update CartEntity interface

## Implementation Plan

### Phase 1: Foundation & Schema Updates (Day 1)

**Step 1: Update TypeScript Interfaces**
- File: `/src/shared/types/dynamodb.types.ts`
- Add `version: number` to CartEntity interface
- Update CartResponse type to include `itemCount`
- Add `currentProduct` field to CartItemResponse for GET enrichment

**Step 2: Update Cart Types**
- File: `/src/functions/cart/types.ts`
- Remove `productName` and `price` from AddItemRequest (security)
- Keep UpdateItemRequest unchanged
- Add ProductValidationResult interface

**Step 3: Create Validation Utilities**
- File: `/src/functions/cart/utils/validation.ts` (NEW)
- Implement `validateProduct(productId, quantity, productsService)` function
- Return ProductEntity or throw appropriate errors
- Add stock validation helper

**Step 4: Create Retry Utilities**
- File: `/src/functions/cart/utils/retry.ts` (NEW)
- Implement `sleep(ms)` helper
- Implement `saveCartWithRetry(cart, cartService, maxRetries)` function
- Handle ConditionalCheckFailedException
- Implement exponential backoff

### Phase 2: Cart Service Enhancements (Day 2)

**Step 5: Add Optimistic Locking to Cart Service**
- File: `/src/functions/cart/services/cart.service.ts`
- Update `saveCart()` method signature to accept expectedVersion
- Add `ConditionExpression` to PutCommand:
  ```typescript
  ConditionExpression: 'attribute_not_exists(version) OR version = :expectedVersion'
  ```
- Increment version on each save: `version: (cart.version || 0) + 1`
- Update `getCart()` to initialize version to 0 if not present (backward compatibility)

**Step 6: Refactor Cart Operations**
- Update `addItem()` method:
  - Remove productName and price parameters
  - Accept ProductEntity instead
  - Use product.name and product.price
  - Check if productId already exists (merge quantities)
  - Return cart without saving (caller handles conditional write)
- Update `updateItem()` method:
  - Change signature to accept `productId` instead of `itemId`
  - Find item by productId in items array
  - Return cart without saving (caller handles conditional write)
- Update `removeItem()` method:
  - Change signature to accept `productId` instead of `itemId`
  - Find and remove by productId
  - Return cart without saving (caller handles conditional write)

**Step 7: Add Product Detail Enrichment**
- File: `/src/functions/cart/services/cart.service.ts`
- Create new method: `enrichCartWithProducts(cart, productsService)`
- For each item, fetch current product details
- Add `currentProduct` field to response
- Handle missing products gracefully (set to null)

### Phase 3: Handler Updates (Day 3)

**Step 8: Update Handler Routing**
- File: `/src/functions/cart/handler.ts`
- Update path regex for PUT and DELETE:
  ```typescript
  // OLD: /cart/items/{itemId}
  const itemIdMatch = path.match(/^\/cart\/items\/([^/]+)$/);

  // NEW: /cart/{productId}
  const productIdMatch = path.match(/^\/cart\/([^/]+)$/);
  ```
- Ensure `/cart` without path params routes to GET or DELETE (handle ambiguity)

**Step 9: Implement GET /cart with Enrichment**
- Update `handleGetCart()` function:
  - Fetch cart from CartService
  - If cart exists, call `enrichCartWithProducts()`
  - Add `itemCount` to response
  - Handle empty cart case (return default structure)

**Step 10: Implement POST /cart with Validation**
- Update `handleAddItem()` function:
  - Remove productName, price from request body validation
  - Only require `productId` and `quantity`
  - Call `validateProduct()` to get ProductEntity
  - Fetch current cart (or initialize new cart)
  - Call updated `addItem()` from CartService (pass ProductEntity)
  - Call `saveCartWithRetry()` with conditional write
  - Handle ConflictError (max retries reached)
  - Return updated cart

**Step 11: Implement PUT /cart/{productId} with Validation**
- Update `handleUpdateItem()` function:
  - Extract productId from path params
  - Validate quantity from request body (allow 0)
  - Fetch current cart
  - Validate item exists in cart (by productId)
  - If quantity === 0:
    - Call `removeItem()` from CartService
  - If quantity > 0:
    - Call `validateProduct()` for stock check
    - Call `updateItem()` from CartService
  - Call `saveCartWithRetry()` with conditional write
  - Return updated cart

**Step 12: Implement DELETE /cart/{productId}**
- Update `handleRemoveItem()` function:
  - Extract productId from path params
  - Fetch current cart
  - Validate item exists in cart (by productId)
  - Call `removeItem()` from CartService
  - Call `saveCartWithRetry()` with conditional write
  - Return updated cart

### Phase 4: Integration & Testing (Day 4)

**Step 13: Update SAM Template**
- File: `/template.yaml`
- Add environment variables for Products table
- Add DynamoDB read policy for Products table
- Update API Gateway event paths
- Deploy with `sam build && sam deploy`

**Step 14: Manual Testing**
- Test GET /cart (empty cart)
- Test POST /cart (add new item)
- Test POST /cart (increment existing item)
- Test POST /cart (product not found - expect 404)
- Test POST /cart (insufficient stock - expect 400)
- Test PUT /cart/{productId} (update quantity)
- Test PUT /cart/{productId} (quantity 0 - should remove)
- Test DELETE /cart/{productId}
- Test DELETE /cart (clear cart)

**Step 15: Concurrent Write Testing**
- Use artillery or k6 to simulate concurrent POST requests
- Verify no items are lost
- Verify version conflicts are handled with retries
- Verify ConflictError is returned after max retries

**Step 16: Error Scenario Testing**
- Test with invalid JWT (expect 401)
- Test with inactive product (expect 400)
- Test with product ID not in cart (PUT/DELETE, expect 404)
- Test with invalid quantity (negative, > 99, expect 400)
- Test with very large quantity exceeding stock (expect 400 with available count)

### Phase 5: Documentation & Handoff (Day 5)

**Step 17: Update API Documentation**
- Document new API endpoints in README or API docs
- Include request/response examples
- Document error codes and scenarios

**Step 18: Add Inline Code Documentation**
- Add JSDoc comments to new functions
- Document optimistic locking strategy
- Document retry logic

**Step 19: Update Tests (If Test Suite Exists)**
- Update unit tests for CartService
- Add tests for validation functions
- Add tests for retry logic
- Update integration tests for API endpoints

**Step 20: Deployment Checklist**
- Run `sam build` successfully
- Run `sam deploy` to dev environment
- Verify all endpoints with Postman/curl
- Check CloudWatch Logs for any errors
- Verify DynamoDB table structure (version attribute)
- Update Jira ticket to "Done"

## Testing Strategy

### Unit Tests

**Cart Service Tests** (`cart.service.test.ts`):
```typescript
describe('CartService', () => {
  describe('saveCart with optimistic locking', () => {
    it('should save cart with version increment', async () => {});
    it('should throw ConditionalCheckFailed if version mismatch', async () => {});
    it('should handle first save (no version attribute)', async () => {});
  });

  describe('updateItem by productId', () => {
    it('should update quantity for existing productId', async () => {});
    it('should throw error if productId not in cart', async () => {});
    it('should recalculate subtotal and totalAmount', async () => {});
  });

  describe('removeItem by productId', () => {
    it('should remove item by productId', async () => {});
    it('should throw error if productId not in cart', async () => {});
    it('should recalculate totalAmount', async () => {});
  });
});
```

**Validation Tests** (`validation.test.ts`):
```typescript
describe('validateProduct', () => {
  it('should return product if valid and in stock', async () => {});
  it('should throw NotFoundError if product does not exist', async () => {});
  it('should throw ValidationError if product is inactive', async () => {});
  it('should throw ValidationError if insufficient stock', async () => {});
});
```

**Retry Logic Tests** (`retry.test.ts`):
```typescript
describe('saveCartWithRetry', () => {
  it('should succeed on first attempt', async () => {});
  it('should retry on ConditionalCheckFailedException', async () => {});
  it('should throw ConflictError after max retries', async () => {});
  it('should use exponential backoff', async () => {});
});
```

### Integration Tests

**API Endpoint Tests**:
```typescript
describe('Cart API', () => {
  describe('POST /cart', () => {
    it('should add new item to cart', async () => {});
    it('should increment quantity if item already exists', async () => {});
    it('should return 404 if product not found', async () => {});
    it('should return 400 if insufficient stock', async () => {});
    it('should validate request body', async () => {});
  });

  describe('GET /cart', () => {
    it('should return empty cart if no items', async () => {});
    it('should return cart with enriched product details', async () => {});
    it('should handle deleted products gracefully', async () => {});
  });

  describe('PUT /cart/{productId}', () => {
    it('should update quantity', async () => {});
    it('should remove item if quantity is 0', async () => {});
    it('should return 404 if product not in cart', async () => {});
    it('should validate stock availability', async () => {});
  });

  describe('DELETE /cart/{productId}', () => {
    it('should remove item from cart', async () => {});
    it('should return 404 if product not in cart', async () => {});
  });
});
```

### Concurrency Tests

**Load Testing with Artillery**:
```yaml
# artillery-cart-concurrency.yml
config:
  target: "https://api-endpoint.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: Concurrent POST requests
  variables:
    userId: "test-user-123"
    productId: "test-product-456"
  plugins:
    expect: {}

scenarios:
  - name: "Concurrent Add to Cart"
    flow:
      - post:
          url: "/cart"
          headers:
            Authorization: "Bearer {{jwt_token}}"
          json:
            productId: "{{productId}}"
            quantity: 1
          expect:
            - statusCode: 200
```

**Expected Results:**
- No duplicate items in cart
- No lost quantity increments
- Occasional 409 Conflict errors (acceptable, indicates retry exhaustion)
- Final cart state matches total requests

### Manual Test Cases

| Test Case | Endpoint | Expected Result |
|-----------|----------|-----------------|
| Add item to empty cart | POST /cart | 200, cart with 1 item |
| Add same item twice | POST /cart (2x) | 200, quantity = 2 |
| Add non-existent product | POST /cart | 404 NOT_FOUND |
| Add inactive product | POST /cart | 400 VALIDATION_ERROR |
| Add with stock exceeded | POST /cart | 400 INSUFFICIENT_STOCK |
| Get empty cart | GET /cart | 200, items = [] |
| Get cart with items | GET /cart | 200, enriched with currentProduct |
| Update item quantity | PUT /cart/{productId} | 200, updated cart |
| Update to quantity 0 | PUT /cart/{productId} | 200, item removed |
| Update non-existent item | PUT /cart/{productId} | 404 NOT_FOUND |
| Delete item | DELETE /cart/{productId} | 200, item removed |
| Delete non-existent item | DELETE /cart/{productId} | 404 NOT_FOUND |
| Clear entire cart | DELETE /cart | 200, cart cleared |
| Concurrent adds | POST /cart (10x parallel) | No lost updates |

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Breaking API Changes** - Path changes break existing clients | High | High | Version API or provide backward compatibility layer; coordinate with frontend team |
| **Version Attribute Missing** - Existing carts don't have version field | Medium | High | Handle `attribute_not_exists(version)` in condition expression (backward compatible) |
| **Performance Degradation** - Product lookups add latency | Medium | Medium | Product lookups are single-item GetItem (fast); monitor p95 latency; consider caching |
| **Stock Check Race Condition** - Stock quantity changes between check and save | Medium | Medium | Accept eventual consistency; final stock validation happens during order checkout |
| **Retry Storm** - Many conflicts cause cascading retries | Low | Low | Limit retries to 3; exponential backoff; monitor CloudWatch metrics |
| **Cart Size Explosion** - User adds too many items | Low | Low | Implement MAX_CART_ITEMS validation (50 items) |
| **Product Table Unavailable** - DynamoDB throttling or outage | High | Low | Use PAY_PER_REQUEST billing; implement circuit breaker; graceful degradation for GET /cart |
| **Deleted Products in Cart** - Product is deleted after being added | Medium | Medium | GET /cart handles this gracefully (currentProduct: null); UI shows "Product unavailable" |

## Open Questions

**Q1:** Should we automatically remove items from cart if product is deleted or goes out of stock?
- **Decision Needed By:** Implementation start
- **Options:**
  - A) Keep items, show as unavailable (graceful degradation)
  - B) Auto-remove items when product is deleted
  - C) Mark items as unavailable but keep in cart with warning
- **Recommendation:** Option A - Keep items, return `currentProduct: null` in GET /cart. Let frontend show "Product unavailable" message. This provides better UX (user can see what was in cart) and avoids silent data loss.

**Q2:** How should we handle price changes between add-to-cart and checkout?
- **Decision Needed By:** Implementation start
- **Options:**
  - A) Always show current price at checkout (may surprise user)
  - B) Lock price at add-to-cart time (requires price snapshot in cart)
  - C) Show both prices (old and new) and let user confirm
- **Current Design:** Cart stores price snapshot at add-time. GET /cart returns both cart price and currentProduct.price. Frontend can compare and show price changes.

**Q3:** Should POST /cart enforce a maximum cart size?
- **Decision Needed By:** Implementation start
- **Options:**
  - A) No limit (trust users)
  - B) Soft limit (e.g., 50 items) with validation error
  - C) Hard limit with DynamoDB item size (400KB)
- **Recommendation:** Option B - Enforce 50 item soft limit. Easy to implement, prevents abuse, avoids DynamoDB item size issues.

**Q4:** What should happen on concurrent update conflicts after max retries?
- **Decision Needed By:** Implementation start
- **Options:**
  - A) Return 409 Conflict, force client retry
  - B) Return 500 Internal Server Error
  - C) Silent success (accept stale data)
- **Recommendation:** Option A - Return 409 Conflict with clear error message. Client should implement retry with user feedback ("Cart was updated, retrying...").

**Q5:** Should we implement cart expiration/TTL?
- **Decision Needed By:** Post-MVP
- **Options:**
  - A) No expiration (current design)
  - B) 30-day TTL using DynamoDB TTL attribute
  - C) Weekly cleanup Lambda
- **Current Design:** No expiration (out of scope for POCS-56). Can be added later as enhancement.

## References

- **Jira Ticket:** [POCS-56](https://onespherelabs.atlassian.net/browse/POCS-56)
- **Parent Epic:** [POCS-32 - Shopping Cart](https://onespherelabs.atlassian.net/browse/POCS-32)
- **Existing Codebase:** `/Users/luqmanahmad/Library/CloudStorage/OneDrive-Personal/Documents/16 One Sphare Labs/order-poc`
- **AWS DynamoDB Conditional Writes:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ConditionalUpdate
- **Optimistic Locking Pattern:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBMapper.OptimisticLocking.html
- **SAM Template Reference:** https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification.html

---

## Appendix A: Code Snippets

### Handler Routing Logic

```typescript
// Extract path parameter productId
const productIdMatch = path.match(/^\/cart\/([^/]+)$/);

if (productIdMatch && method === 'PUT') {
  const productId = decodeURIComponent(productIdMatch[1]);
  return await handleUpdateItem(userId, productId, event);
}

if (productIdMatch && method === 'DELETE') {
  const productId = decodeURIComponent(productIdMatch[1]);
  return await handleRemoveItem(userId, productId);
}
```

### Conditional Write Implementation

```typescript
// cart.service.ts
async saveCart(cart: CartEntity, expectedVersion?: number): Promise<CartEntity> {
  const newVersion = (cart.version || 0) + 1;
  const updatedCart = { ...cart, version: newVersion, updatedAt: new Date().toISOString() };

  const params: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: updatedCart,
  };

  if (expectedVersion !== undefined) {
    params.ConditionExpression = 'attribute_not_exists(version) OR version = :expectedVersion';
    params.ExpressionAttributeValues = { ':expectedVersion': expectedVersion };
  }

  await docClient.send(new PutCommand(params));
  return updatedCart;
}
```

### Product Enrichment Logic

```typescript
// cart.service.ts
async enrichCartWithProducts(
  cart: CartEntity,
  productsService: ProductsService
): Promise<CartResponse> {
  const enrichedItems = await Promise.all(
    cart.items.map(async (item) => {
      try {
        const product = await productsService.getProductById(item.productId);
        return {
          ...item,
          currentProduct: product ? {
            name: product.name,
            price: product.price,
            stock: product.stock,
            status: product.status,
            imageUrl: product.imageUrl,
          } : null,
        };
      } catch (error) {
        console.warn(`Failed to fetch product ${item.productId}:`, error);
        return { ...item, currentProduct: null };
      }
    })
  );

  return {
    userId: cart.userId,
    items: enrichedItems,
    totalAmount: cart.totalAmount,
    currency: cart.currency,
    itemCount: cart.items.length,
    updatedAt: cart.updatedAt,
  };
}
```

### Retry Logic with Exponential Backoff

```typescript
// retry.ts
export async function saveCartWithRetry(
  cart: CartEntity,
  cartService: CartService,
  maxRetries: number = 3
): Promise<CartEntity> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await cartService.saveCart(cart, cart.version);
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        attempt++;
        console.warn(`Cart save conflict (attempt ${attempt}/${maxRetries})`);

        if (attempt >= maxRetries) {
          throw new ConflictError(
            'Cart was modified by another request. Please retry.',
            { userId: cart.userId, attempts: attempt }
          );
        }

        // Exponential backoff: 100ms, 200ms, 400ms
        await sleep(100 * Math.pow(2, attempt - 1));

        // Refetch latest cart to get new version
        const latestCart = await cartService.getCart(cart.userId);
        if (latestCart) {
          cart.version = latestCart.version;
        }

        continue;
      }

      throw error;
    }
  }

  throw new ConflictError('Max retry attempts reached');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

**End of Technical Design Document**
