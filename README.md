# Bitespeed Identity Reconciliation Service

A backend service for reconciling customer identities across multiple contact methods (email and phone number).

## 🚀 Quick Links

- **[Quick Deploy Guide](QUICK_DEPLOY.md)** - Deploy in 5 minutes
- **[Full Deployment Guide](DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions
- **[Testing Guide](TESTING.md)** - How to test the API
- **[Postman Guide](POSTMAN_GUIDE.md)** - Test with Postman
- **[Custom Testing](CUSTOM_TESTING_GUIDE.md)** - Create your own test cases

## ✨ Features

- ✅ Identity reconciliation across email and phone numbers
- ✅ Automatic primary contact merging
- ✅ Secondary contact linking
- ✅ RESTful API
- ✅ Type-safe with TypeScript
- ✅ Comprehensive test coverage
- ✅ Production-ready

## Setup

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npm run prisma:generate
```

3. Run database migrations:
```bash
npm run prisma:migrate
```

## Development

Start the development server:
```bash
npm run dev
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Environment Variables

The application requires environment variables to be configured. Copy `.env.example` to `.env` and configure the values:

```bash
cp .env.example .env
```

### Required Variables

- **DATABASE_URL** (required): Database connection string
  - SQLite format: `file:./path/to/database.db`
  - PostgreSQL format: `postgresql://user:password@localhost:5432/dbname`
  - MySQL format: `mysql://user:password@localhost:3306/dbname`

### Optional Variables

- **PORT** (optional, default: 3000): The port number on which the server will listen
- **NODE_ENV** (optional, default: development): The environment mode (development, production, test)

### Example Configuration

```env
DATABASE_URL="file:./prisma/dev.db"
PORT=3000
NODE_ENV=development
```

## API

### POST /identify

Reconcile customer identity based on email and/or phone number.

**Request:**
```json
{
  "email": "example@email.com",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["example@email.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

## Tech Stack

- Node.js with TypeScript
- Express.js
- Prisma ORM
- SQLite (development) / PostgreSQL (production)
- Vitest (testing)
- fast-check (property-based testing)

## 🚀 Deployment

### Quick Deploy Options:

1. **Render** (Easiest - Free tier available)
   ```bash
   # See QUICK_DEPLOY.md for one-click deploy
   ```

2. **Railway** (Fast - PostgreSQL included)
   ```bash
   npm i -g @railway/cli
   railway login
   railway init
   railway up
   ```

3. **Docker** (Local or any cloud)
   ```bash
   docker-compose up -d
   ```

See [QUICK_DEPLOY.md](QUICK_DEPLOY.md) for detailed instructions.

## 📖 Documentation

- **[Requirements](/.kiro/specs/bitespeed-identity-reconciliation/requirements.md)** - Detailed requirements
- **[Design Document](/.kiro/specs/bitespeed-identity-reconciliation/design.md)** - Architecture and design
- **[Tasks](/.kiro/specs/bitespeed-identity-reconciliation/tasks.md)** - Implementation tasks

## 🧪 Testing

### Run Automated Tests
```bash
npm test
```

### Interactive Testing
```bash
# Start server
npm start

# In another terminal, use the test helper
./test-helper.sh
```

### Test with Postman
1. Import `Bitespeed_Identity_API.postman_collection.json`
2. Follow the [Postman Guide](POSTMAN_GUIDE.md)

## 📊 Project Structure

```
.
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Database access
│   ├── types/          # TypeScript types
│   ├── app.ts          # Express app setup
│   ├── config.ts       # Configuration
│   └── index.ts        # Entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
├── tests/              # Test files
└── docs/              # Documentation

```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📝 License

MIT
