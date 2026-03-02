# Testing Guide - Bitespeed Identity Reconciliation

## Quick Start

### 1. Start the Server

```bash
npm start
```

The server will start on port 3000 (or the PORT specified in your .env file).

### 2. Test the API

You can test using curl, Postman, or any HTTP client.

## Test Scenarios

### Scenario 1: Create a New Contact

**Request:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "phoneNumber": "1234567890"
  }'
```

**Expected Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

### Scenario 2: Add New Email to Existing Contact

**Request:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.work@example.com",
    "phoneNumber": "1234567890"
  }'
```

**Expected Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com", "alice.work@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2]
  }
}
```

### Scenario 3: Add New Phone to Existing Contact

**Request:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "phoneNumber": "9876543210"
  }'
```

**Expected Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["alice@example.com", "alice.work@example.com"],
    "phoneNumbers": ["1234567890", "9876543210"],
    "secondaryContactIds": [2, 3]
  }
}
```

### Scenario 4: Merge Two Primary Contacts

First, create a separate contact:
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@example.com",
    "phoneNumber": "5555555555"
  }'
```

Then link them by providing both identities:
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "phoneNumber": "5555555555"
  }'
```

**Expected Response:**
The older contact becomes primary, and all information is consolidated.

### Scenario 5: Error Cases

**Missing both email and phone:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:** 400 Bad Request

## Running Automated Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode (for development)
npm test -- --watch
```

## Verify Database State

You can inspect the database directly:

```bash
# Open SQLite database
sqlite3 prisma/dev.db

# View all contacts
SELECT * FROM Contact;

# View primary contacts only
SELECT * FROM Contact WHERE linkPrecedence = 'primary';

# View secondary contacts with their primary
SELECT c.id, c.email, c.phoneNumber, c.linkedId, p.email as primary_email 
FROM Contact c 
LEFT JOIN Contact p ON c.linkedId = p.id 
WHERE c.linkPrecedence = 'secondary';
```

## Health Check

The service is working correctly if:
1. ✅ Server starts without errors
2. ✅ All automated tests pass (21/21)
3. ✅ API responds to requests
4. ✅ Database operations complete successfully
5. ✅ Responses match expected format

## Troubleshooting

**Server won't start:**
- Check if port 3000 is available
- Verify DATABASE_URL in .env file
- Run `npx prisma generate` to regenerate Prisma client

**Database errors:**
- Run `npx prisma migrate deploy` to apply migrations
- Check file permissions on prisma/dev.db

**Tests failing:**
- Ensure database is accessible
- Run `npx prisma generate` before testing
- Check that all dependencies are installed
