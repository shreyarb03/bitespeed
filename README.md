# Bitespeed Identity Reconciliation API

A robust identity reconciliation service that links customer contacts across multiple purchases using email and phone number matching. Built with Node.js, Express, TypeScript, and Prisma ORM.

## 🚀 Live Demo

**API Base URL:** https://bitespeed-7ke0.onrender.com/

**Endpoints:**
- `GET /` - API information
- `GET /health` - Health check
- `POST /identify` - Identity reconciliation endpoint

## 📋 Overview

This service helps e-commerce platforms identify and consolidate customer information across multiple orders. When a customer makes purchases using different email addresses or phone numbers, the system intelligently links these contacts together, maintaining a primary contact and associating secondary contacts.

### Key Features

- **Smart Contact Linking**: Automatically links contacts with matching email or phone numbers
- **Primary/Secondary Hierarchy**: Maintains a clear hierarchy of contact relationships
- **Conflict Resolution**: Handles complex scenarios where multiple primary contacts need to be merged
- **RESTful API**: Simple JSON-based API for easy integration
- **PostgreSQL Database**: Reliable data persistence with Prisma ORM
- **Type-Safe**: Built with TypeScript for enhanced code quality

## 🛠️ Tech Stack

- **Runtime**: Node.js 
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Deployment**: Render

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- PostgreSQL database

### Local Setup

1. Clone the repository:
```bash
git clone https://github.com/shreyarb03/bitespeed.git
cd bitespeed
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bitespeed"
PORT=3000
NODE_ENV=development
```

4. Run database migrations:
```bash
npx prisma migrate deploy
npx prisma generate
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 🔌 API Usage

### POST /identify

Identifies and consolidates customer contact information.

**Request:**
```json
POST /identify
Content-Type: application/json

{
  "email": "customer@example.com",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["customer@example.com", "alternate@example.com"],
    "phoneNumbers": ["1234567890", "0987654321"],
    "secondaryContactIds": [2, 3]
  }
}
```

### Example Scenarios

**Scenario 1: New Contact**
```bash
curl -X POST https://bitespeed-7ke0.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","phoneNumber":"1111111111"}'
```

**Scenario 2: Linking Contacts**
```bash
# First request creates primary contact
curl -X POST https://bitespeed-7ke0.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","phoneNumber":"1234567890"}'

# Second request with new email links to existing phone
curl -X POST https://bitespeed-7ke0.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@example.com","phoneNumber":"1234567890"}'
```

## 🧪 Testing with Postman

### Quick Start

1. **Import the Collection**
   - Download [Bitespeed_Identity_API.postman_collection.json](./Bitespeed_Identity_API.postman_collection.json)
   - Open Postman → Import → Select the file

2. **Set Up Environment**
   - Create a new environment called "Production"
   - Add variable: `base_url` = `https://bitespeed-7ke0.onrender.com`
   - Select "Production" environment

3. **Run Tests**
   - Test 1: Create New Contact
   - Test 2: Add New Email to Existing Contact
   - Test 3: Add New Phone to Existing Contact
   - Test 4: Query Existing Contact (Email Only)
   - Test 5: Query Existing Contact (Phone Only)
   - Test 6: Create Second Primary Contact
   - Test 7: Merge Two Primary Contacts
   - Test 8: Complex Scenario - Multiple Links

### Sample Test Cases

**Test 1: Create New Contact**
```json
POST {{base_url}}/identify
{
  "email": "alice@example.com",
  "phoneNumber": "1234567890"
}
```

**Test 2: Link with New Email**
```json
POST {{base_url}}/identify
{
  "email": "alice.work@example.com",
  "phoneNumber": "1234567890"
}
```

**Test 3: Merge Primary Contacts**
```json
POST {{base_url}}/identify
{
  "email": "alice@example.com",
  "phoneNumber": "9876543210"
}
```

## 🏗️ Project Structure

```
bitespeed/
├── src/
│   ├── app.ts                    # Express app configuration
│   ├── index.ts                  # Server entry point
│   ├── config.ts                 # Environment configuration
│   ├── controllers/
│   │   └── IdentityController.ts # Request handlers
│   ├── services/
│   │   └── IdentityService.ts    # Business logic
│   ├── repositories/
│   │   └── ContactRepository.ts  # Database operations
│   └── types/
│       └── contact.ts            # TypeScript types
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
├── package.json
├── tsconfig.json
└── README.md
```

## 🚢 Deployment

The application is deployed on Render with automatic deployments from the main branch.

### Deploy Your Own

1. Fork this repository
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repository
4. Create a PostgreSQL database on Render
5. Set environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
6. Deploy!

## 📊 Database Schema

```prisma
model Contact {
  id              Int       @id @default(autoincrement())
  phoneNumber     String?
  email           String?
  linkedId        Int?
  linkPrecedence  String    // "primary" or "secondary"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  
  linkedContact   Contact?  @relation("ContactLinks", fields: [linkedId], references: [id])
  linkedContacts  Contact[] @relation("ContactLinks")
}
```

## 🔒 Error Handling

The API returns appropriate HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid input (missing email and phone)
- `500 Internal Server Error`: Server-side error

**Error Response Format:**
```json
{
  "error": "Error message description"
}
```

## 🧩 Business Logic

### Contact Linking Rules

1. **New Contact**: If no matching email or phone exists, create a new primary contact
2. **Single Match**: If one contact matches, create a secondary contact linked to it
3. **Multiple Matches**: If multiple contacts match:
   - Keep the oldest as primary
   - Convert others to secondary
   - Link all to the primary contact

### Edge Cases Handled

- Duplicate requests (idempotent)
- Null email or phone number
- Multiple primary contacts with same information
- Circular reference prevention
- Transaction rollback on errors

## 📝 Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:studio    # Open Prisma Studio
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

Shreya - [GitHub](https://github.com/shreyarb03)

## 🙏 Acknowledgments

- Built for the Bitespeed Backend Task
- Inspired by real-world e-commerce identity reconciliation challenges

---

**Note:** The free tier on Render may spin down after inactivity. The first request after idle time may take 30-60 seconds to respond while the service wakes up.
