# Order POC - Serverless Order Management System

A production-ready serverless order management system built with AWS SAM, Lambda, API Gateway, DynamoDB, and Cognito.

## Architecture

### Tech Stack
- **Runtime:** Node.js 20.x (TypeScript)
- **Infrastructure:** AWS SAM
- **Compute:** AWS Lambda (ARM64)
- **API:** API Gateway REST API
- **Database:** DynamoDB (single-table design)
- **Authentication:** Amazon Cognito

### Components

#### Lambda Functions
- **Auth Function** - User registration, login, password reset, profile management
- **Products Function** - Product catalog CRUD operations
- **Cart Function** - Shopping cart management
- **Orders Function** - Order creation and tracking

#### DynamoDB Tables
- **Users Table** - User profiles and metadata
- **Products Table** - Product catalog
- **Carts Table** - Active shopping carts
- **Orders Table** - Order history and status

#### Authentication
- Amazon Cognito User Pool with email-based authentication
- JWT token-based authorization
- Password policies and account recovery

## Project Structure

```
order-poc/
├── events/                      # Sample event payloads for local testing
│   ├── auth-register.json
│   ├── auth-login.json
│   ├── product-get.json
│   ├── cart-add-item.json
│   └── order-create.json
├── src/
│   ├── functions/
│   │   ├── auth/               # Authentication function
│   │   ├── products/           # Products function
│   │   ├── cart/               # Cart function
│   │   └── orders/             # Orders function
│   └── shared/
│       ├── types/              # Shared TypeScript types
│       ├── utils/              # Shared utilities
│       └── middleware/         # Shared middleware
├── template.yaml               # SAM template (IaC)
├── samconfig.toml              # SAM deployment config
├── tsconfig.json
└── package.json
```

## Prerequisites

### Required Tools
- **Node.js 20.x or later** - [Download](https://nodejs.org/)
- **AWS SAM CLI** - [Installation Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- **AWS CLI** - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **Docker** - [Download](https://www.docker.com/products/docker-desktop/) (for local testing)

### AWS SAM CLI Installation

**macOS (Homebrew):**
```bash
brew install aws-sam-cli
sam --version
```

**Windows:**
```bash
# Using MSI installer from:
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

**Linux:**
```bash
# Follow instructions at:
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

### AWS Configuration
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-east-1)
# Enter your default output format (e.g., json)
```

## Getting Started

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install function dependencies (done automatically by SAM during build)
cd src/functions/auth && npm install && cd ../../..
cd src/functions/products && npm install && cd ../../..
cd src/functions/cart && npm install && cd ../../..
cd src/functions/orders && npm install && cd ../../..
```

### 2. Validate SAM Template

```bash
sam validate --lint
```

### 3. Build the Application

```bash
sam build
```

This compiles TypeScript to JavaScript using esbuild and prepares the Lambda functions for deployment.

### 4. Local Testing

**Start Local API:**
```bash
sam local start-api
```

The API will be available at `http://localhost:3000`

**Invoke Individual Functions:**
```bash
# Test Auth Register
sam local invoke AuthFunction --event events/auth-register.json

# Test Auth Login
sam local invoke AuthFunction --event events/auth-login.json

# Test Products List
sam local invoke ProductsFunction --event events/product-get.json

# Test Add to Cart
sam local invoke CartFunction --event events/cart-add-item.json

# Test Create Order
sam local invoke OrdersFunction --event events/order-create.json
```

### 5. Deploy to AWS

**First Deployment (Guided):**
```bash
sam deploy --guided
```

Follow the prompts:
- Stack Name: `order-poc-dev`
- AWS Region: `us-east-1` (or your preferred region)
- Parameter Environment: `dev`
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- Save arguments to configuration file: `Y`

**Subsequent Deployments:**
```bash
sam deploy
```

### 6. Get Stack Outputs

```bash
sam list stack-outputs --stack-name order-poc-dev
```

This will display:
- API Gateway endpoint URL
- Cognito User Pool ID
- Cognito Client ID
- Lambda function ARNs
- DynamoDB table names

## API Endpoints

### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/forgot-password` | Initiate password reset |
| POST | `/auth/reset-password` | Complete password reset |

### Authentication (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/refresh-token` | Refresh access token |
| GET | `/auth/profile` | Get user profile |

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/products` | List all products | No |
| GET | `/products/{id}` | Get product by ID | No |
| POST | `/products` | Create product | Yes |
| PUT | `/products/{id}` | Update product | Yes |
| DELETE | `/products/{id}` | Delete product | Yes |

### Cart (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get user's cart |
| POST | `/cart/items` | Add item to cart |
| PUT | `/cart/items/{itemId}` | Update cart item |
| DELETE | `/cart/items/{itemId}` | Remove cart item |
| DELETE | `/cart` | Clear cart |

### Orders (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Create order |
| GET | `/orders` | List user's orders |
| GET | `/orders/{id}` | Get order by ID |
| PUT | `/orders/{id}/status` | Update order status |

## Example API Calls

### Register User
```bash
curl -X POST https://YOUR_API_ENDPOINT/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890"
  }'
```

### Login
```bash
curl -X POST https://YOUR_API_ENDPOINT/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Create Product (Authenticated)
```bash
curl -X POST https://YOUR_API_ENDPOINT/dev/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Sample Product",
    "description": "A great product",
    "price": 29.99,
    "currency": "USD",
    "stock": 100,
    "category": "Electronics"
  }'
```

### Add to Cart (Authenticated)
```bash
curl -X POST https://YOUR_API_ENDPOINT/dev/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "productId": "product-id-here",
    "productName": "Sample Product",
    "price": 29.99,
    "quantity": 2
  }'
```

### Create Order (Authenticated)
```bash
curl -X POST https://YOUR_API_ENDPOINT/dev/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "items": [
      {
        "productId": "product-id",
        "productName": "Sample Product",
        "price": 29.99,
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "credit_card"
  }'
```

## Monitoring and Logs

### View Logs
```bash
# Real-time logs for Auth function
sam logs -n AuthFunction --stack-name order-poc-dev --tail

# Real-time logs for Products function
sam logs -n ProductsFunction --stack-name order-poc-dev --tail

# Logs for specific time range
sam logs -n AuthFunction --stack-name order-poc-dev --start-time '10min ago' --end-time '5min ago'
```

### CloudWatch Logs
All Lambda functions automatically log to CloudWatch Logs. Log groups follow the pattern:
```
/aws/lambda/OrderPOC-{FunctionName}-{Environment}
```

## Cleanup

To delete the deployed stack and all resources:

```bash
sam delete --stack-name order-poc-dev
```

## Development

### Adding a New Lambda Function

1. Create function directory: `src/functions/my-function/`
2. Add `handler.ts`, `types.ts`, `package.json`
3. Add services in `services/` directory
4. Update `template.yaml` with new function resource
5. Add API Gateway events
6. Run `sam build` and `sam deploy`

### TypeScript Compilation

The project uses esbuild for fast TypeScript compilation. Configuration is in the SAM template under each function's `Metadata.BuildProperties`.

### Shared Code

Shared utilities and types are in `src/shared/`:
- `types/` - TypeScript interfaces and types
- `utils/` - Response helpers, error handling, validation
- `middleware/` - CORS and error handling middleware

## Security

### IAM Policies
Each Lambda function has least-privilege IAM policies:
- Auth Function: DynamoDB access to Users table, Cognito admin operations
- Products Function: DynamoDB access to Products table
- Cart Function: DynamoDB access to Carts table
- Orders Function: DynamoDB access to Orders table

### Authentication
- Cognito User Pool with strong password policies
- JWT tokens for API authentication
- HTTPS-only API endpoints
- CORS enabled with configurable origins

### Environment Variables
Never commit sensitive data. Use AWS Systems Manager Parameter Store or Secrets Manager for production credentials.

## Troubleshooting

### SAM Build Fails
```bash
# Clear SAM cache
rm -rf .aws-sam
sam build --use-container
```

### Local API Not Starting
```bash
# Ensure Docker is running
docker ps

# Check for port conflicts
lsof -i :3000
```

### Deployment Fails
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name order-poc-dev

# Validate template
sam validate --lint
```

## License

ISC

## Support

For issues and questions, please open a GitHub issue.
