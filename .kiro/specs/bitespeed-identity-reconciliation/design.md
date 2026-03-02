# Design Document: Bitespeed Identity Reconciliation

## Overview

The Bitespeed Identity Reconciliation service is a RESTful web service that maintains a unified view of customer identities across multiple contact methods. The service implements a graph-based identity linking system where contacts are organized into trees with a single primary contact as the root and secondary contacts as children.

The core challenge is handling the dynamic nature of identity discovery - as new information arrives, the service must efficiently determine whether to create new contacts, link existing contacts, or merge separate identity trees. The design prioritizes data consistency and correctness through transactional database operations.

### Key Design Decisions

1. **Tree-based Identity Model**: Each customer identity is represented as a tree with one primary contact (root) and zero or more secondary contacts (children). This provides a clear hierarchy and simplifies consolidation logic.

2. **Age-based Primary Selection**: When merging identity trees, the older primary contact (by createdAt timestamp) becomes the root. This ensures stable, deterministic behavior.

3. **Transactional Operations**: All database operations within a single request are wrapped in transactions to maintain consistency during concurrent access.

4. **TypeScript with Express**: Provides type safety and a mature ecosystem for building REST APIs.

5. **Prisma ORM**: Offers type-safe database access, migrations, and works with multiple SQL databases.

## Architecture

### System Components

```
┌─────────────────┐
│  HTTP Client    │
└────────┬────────┘
         │ POST /identify
         ▼
┌─────────────────────────────────┐
│   Express HTTP Server           │
│  ┌──────────────────────────┐  │
│  │  Identity Controller     │  │
│  │  - Request validation    │  │
│  │  - Response formatting   │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   Identity Service              │
│  ┌──────────────────────────┐  │
│  │  Reconciliation Logic    │  │
│  │  - Match finding         │  │
│  │  - Link determination    │  │
│  │  - Tree merging          │  │
│  │  - Consolidation         │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   Data Access Layer (Prisma)    │
│  ┌──────────────────────────┐  │
│  │  Contact Repository      │  │
│  │  - CRUD operations       │  │
│  │  - Query methods         │  │
│  │  - Transaction mgmt      │  │
│  └──────────┬───────────────┘  │
└─────────────┼───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│   SQL Database                  │
│   (PostgreSQL/MySQL/SQLite)     │
│  ┌──────────────────────────┐  │
│  │  Contact Table           │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```

### Request Flow

1. **HTTP Request Reception**: Express server receives POST request at `/identify` endpoint
2. **Request Validation**: Controller validates JSON body contains email and/or phoneNumber
3. **Identity Reconciliation**: Service layer executes reconciliation logic within a database transaction
4. **Contact Consolidation**: Service aggregates all linked contact information
5. **Response Formation**: Controller formats consolidated data into required JSON structure
6. **HTTP Response**: Server returns JSON response to client

## Components and Interfaces

### 1. HTTP Controller Layer

**IdentityController**
- Handles HTTP request/response lifecycle
- Validates incoming request body
- Delegates business logic to service layer
- Formats responses according to API specification

```typescript
interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

interface IdentifyResponse {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

class IdentityController {
  async identify(req: Request, res: Response): Promise<void>
}
```

### 2. Identity Service Layer

**IdentityService**
- Implements core reconciliation logic
- Manages database transactions
- Coordinates between matching, linking, and consolidation operations

```typescript
class IdentityService {
  async reconcileIdentity(
    email: string | null,
    phoneNumber: string | null
  ): Promise<ConsolidatedContact>
  
  private async findMatchingContacts(
    email: string | null,
    phoneNumber: string | null
  ): Promise<Contact[]>
  
  private async determinePrimaryContact(
    matches: Contact[]
  ): Promise<Contact>
  
  private async linkContacts(
    primaryContact: Contact,
    matches: Contact[]
  ): Promise<void>
  
  private async createNewContact(
    email: string | null,
    phoneNumber: string | null,
    linkedId: number | null,
    linkPrecedence: 'primary' | 'secondary'
  ): Promise<Contact>
  
  private async consolidateContacts(
    primaryContact: Contact
  ): Promise<ConsolidatedContact>
}
```

### 3. Data Access Layer

**ContactRepository**
- Encapsulates all database operations
- Provides query methods for finding contacts
- Manages transactions

```typescript
interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

class ContactRepository {
  async findByEmail(email: string): Promise<Contact[]>
  
  async findByPhoneNumber(phoneNumber: string): Promise<Contact[]>
  
  async findByEmailOrPhoneNumber(
    email: string | null,
    phoneNumber: string | null
  ): Promise<Contact[]>
  
  async findById(id: number): Promise<Contact | null>
  
  async findAllLinked(primaryId: number): Promise<Contact[]>
  
  async create(data: CreateContactData): Promise<Contact>
  
  async update(id: number, data: UpdateContactData): Promise<Contact>
  
  async updateMany(ids: number[], data: UpdateContactData): Promise<void>
  
  async transaction<T>(fn: () => Promise<T>): Promise<T>
}
```

### 4. Database Schema

**Contact Table**

```sql
CREATE TABLE Contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phoneNumber VARCHAR(255),
  email VARCHAR(255),
  linkedId INTEGER,
  linkPrecedence VARCHAR(20) NOT NULL CHECK(linkPrecedence IN ('primary', 'secondary')),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (linkedId) REFERENCES Contact(id)
);

CREATE INDEX idx_contact_email ON Contact(email);
CREATE INDEX idx_contact_phone ON Contact(phoneNumber);
CREATE INDEX idx_contact_linkedId ON Contact(linkedId);
```

## Data Models

### Contact Entity

Represents a single contact record in the database.

**Fields:**
- `id`: Unique identifier (auto-increment)
- `phoneNumber`: Phone number (nullable)
- `email`: Email address (nullable)
- `linkedId`: Reference to primary contact ID (null for primary contacts)
- `linkPrecedence`: Either "primary" or "secondary"
- `createdAt`: Timestamp of creation
- `updatedAt`: Timestamp of last modification
- `deletedAt`: Soft delete timestamp (nullable)

**Invariants:**
- At least one of `email` or `phoneNumber` must be non-null
- If `linkPrecedence` is "primary", then `linkedId` must be null
- If `linkPrecedence` is "secondary", then `linkedId` must reference a valid primary contact
- `createdAt` <= `updatedAt`

### Consolidated Contact

Represents the aggregated view of a customer identity.

```typescript
interface ConsolidatedContact {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}
```

**Construction Rules:**
1. `primaryContactId` is the ID of the root primary contact
2. `emails` contains all unique emails from primary and secondary contacts, ordered by createdAt
3. `phoneNumbers` contains all unique phone numbers from primary and secondary contacts, ordered by createdAt
4. `secondaryContactIds` contains IDs of all secondary contacts linked to the primary
5. Null values are excluded from arrays
6. Primary contact's email/phone appears first in respective arrays

## Reconciliation Algorithm

The identity reconciliation process follows these steps:

### Step 1: Find Matching Contacts

Query the database for all contacts that match the provided email OR phoneNumber:

```typescript
const matches = await repository.findByEmailOrPhoneNumber(email, phoneNumber);
```

### Step 2: Determine Action Based on Matches

**Case A: No matches found**
- Create a new primary contact with the provided information
- Return consolidated view of the new contact

**Case B: Exact match found (same email AND phoneNumber)**
- Use the existing contact's primary contact
- Check if new information needs to be added (neither email nor phone is new)
- If all information already exists, return consolidated view
- If new information exists, create secondary contact

**Case C: Partial match found (email OR phoneNumber matches, but not both)**
- Find the primary contact for the matched contact(s)
- Create a new secondary contact with the new information
- Link to the primary contact
- Return consolidated view

**Case D: Multiple distinct primary contacts found**
- This occurs when email matches one primary tree and phoneNumber matches a different primary tree
- Merge the trees by converting the newer primary to secondary
- Update all secondary contacts of the converted primary to point to the older primary
- Create a new secondary contact if needed for the new information
- Return consolidated view

### Step 3: Primary Contact Determination

When multiple contacts are matched, determine the primary contact:

```typescript
function determinePrimaryContact(matches: Contact[]): Contact {
  // Collect all primary contacts from matches
  const primaries = matches
    .filter(c => c.linkPrecedence === 'primary')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  if (primaries.length > 0) {
    return primaries[0]; // Oldest primary
  }
  
  // If all matches are secondary, find their primary
  const linkedId = matches[0].linkedId;
  return await repository.findById(linkedId);
}
```

### Step 4: Link Contacts

When merging identity trees:

```typescript
async function linkContacts(
  olderPrimary: Contact,
  newerPrimary: Contact
): Promise<void> {
  // Convert newer primary to secondary
  await repository.update(newerPrimary.id, {
    linkedId: olderPrimary.id,
    linkPrecedence: 'secondary',
    updatedAt: new Date()
  });
  
  // Update all children of newer primary to point to older primary
  const children = await repository.findAllLinked(newerPrimary.id);
  const childIds = children.map(c => c.id);
  
  if (childIds.length > 0) {
    await repository.updateMany(childIds, {
      linkedId: olderPrimary.id,
      updatedAt: new Date()
    });
  }
}
```

### Step 5: Consolidate Contact Information

Aggregate all information from the primary contact and its linked secondary contacts:

```typescript
async function consolidateContacts(
  primaryContact: Contact
): Promise<ConsolidatedContact> {
  // Get all linked contacts
  const allContacts = [
    primaryContact,
    ...(await repository.findAllLinked(primaryContact.id))
  ];
  
  // Sort by createdAt for consistent ordering
  allContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  // Collect unique emails and phone numbers
  const emails: string[] = [];
  const phoneNumbers: string[] = [];
  const secondaryContactIds: number[] = [];
  
  for (const contact of allContacts) {
    if (contact.email && !emails.includes(contact.email)) {
      emails.push(contact.email);
    }
    if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
      phoneNumbers.push(contact.phoneNumber);
    }
    if (contact.id !== primaryContact.id) {
      secondaryContactIds.push(contact.id);
    }
  }
  
  return {
    primaryContactId: primaryContact.id,
    emails,
    phoneNumbers,
    secondaryContactIds
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Request Body Validation
*For any* HTTP POST request to `/identify`, if the request body contains valid JSON with at least one of email or phoneNumber as a non-null value, the endpoint should accept and process the request.
**Validates: Requirements 1.2**

### Property 2: Response Structure Conformance
*For any* valid request to `/identify`, the response should conform to the schema `{"contact": {"primaryContactId": number, "emails": string[], "phoneNumbers": string[], "secondaryContactIds": number[]}}`.
**Validates: Requirements 1.5**

### Property 3: Link Precedence Validity
*For any* contact in the database, the linkPrecedence field should be either "primary" or "secondary".
**Validates: Requirements 2.5, 3.2, 5.3**

### Property 4: Primary Contact Invariant
*For any* contact with linkPrecedence="primary", the linkedId field should be null.
**Validates: Requirements 2.6, 3.3**

### Property 5: Secondary Contact Invariant
*For any* contact with linkPrecedence="secondary", the linkedId field should reference a valid primary contact (a contact with linkPrecedence="primary" and linkedId=null).
**Validates: Requirements 2.7, 5.4**

### Property 6: Timestamp Creation
*For any* newly created contact, the createdAt field should be set to a valid timestamp at the time of creation.
**Validates: Requirements 2.8**

### Property 7: Timestamp Update
*For any* contact that is modified, the updatedAt field should be updated to reflect the modification time and should be greater than or equal to createdAt.
**Validates: Requirements 2.9**

### Property 8: New Contact Creation Round Trip
*For any* contact information (email and/or phoneNumber) that has no existing matches in the database, calling identify should create a new primary contact, and the stored values should match the provided values.
**Validates: Requirements 3.1, 3.4**

### Property 9: Email Matching
*For any* email address provided to the identify endpoint, the system should find and return all contacts (primary or secondary) that have that exact email address.
**Validates: Requirements 4.1**

### Property 10: Phone Number Matching
*For any* phone number provided to the identify endpoint, the system should find and return all contacts (primary or secondary) that have that exact phone number.
**Validates: Requirements 4.2**

### Property 11: OR Matching Logic
*For any* request with both email and phoneNumber, the system should find contacts that match either the email OR the phoneNumber (or both).
**Validates: Requirements 4.3**

### Property 12: Secondary Contact Creation for New Email
*For any* existing contact with a phoneNumber, if identify is called with the same phoneNumber but a new email (not in the database), a new secondary contact should be created with the new email, linked to the primary contact of the existing contact.
**Validates: Requirements 5.1**

### Property 13: Secondary Contact Creation for New Phone
*For any* existing contact with an email, if identify is called with the same email but a new phoneNumber (not in the database), a new secondary contact should be created with the new phoneNumber, linked to the primary contact of the existing contact.
**Validates: Requirements 5.2**

### Property 14: Secondary Contacts Point to Primary
*For any* secondary contact created when the matched contact is itself a secondary, the new secondary contact should have its linkedId set to the primary contact's id (not the matched secondary's id).
**Validates: Requirements 5.5**

### Property 15: Primary Contact Merging
*For any* two separate primary contacts (one matched by email, one by phoneNumber), when identify is called with both their email and phoneNumber, the system should merge them by converting the newer primary (by createdAt) to a secondary contact linked to the older primary.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 16: Child Relinking During Merge
*For any* primary contact that gets converted to secondary during a merge, all of its existing secondary contacts should be updated to have their linkedId point to the older primary contact.
**Validates: Requirements 6.5**

### Property 17: Age Determination by Timestamp
*For any* two primary contacts being merged, the contact with the earlier createdAt timestamp should remain as the primary contact.
**Validates: Requirements 6.6**

### Property 18: Consolidated Contact Completeness
*For any* request to identify, the returned consolidated contact should include the primary contact ID and all unique emails, phone numbers, and secondary contact IDs from the entire identity tree.
**Validates: Requirements 7.1, 7.2**

### Property 19: Email Uniqueness and Completeness
*For any* consolidated contact response, the emails array should contain all unique email addresses from the primary contact and all its linked secondary contacts, with no duplicates and no null values.
**Validates: Requirements 7.3, 7.8**

### Property 20: Phone Number Uniqueness and Completeness
*For any* consolidated contact response, the phoneNumbers array should contain all unique phone numbers from the primary contact and all its linked secondary contacts, with no duplicates and no null values.
**Validates: Requirements 7.4, 7.8**

### Property 21: Secondary Contact IDs Completeness
*For any* consolidated contact response, the secondaryContactIds array should contain the IDs of all contacts with linkPrecedence="secondary" that have linkedId equal to the primary contact's ID.
**Validates: Requirements 7.5**

### Property 22: Contact Information Ordering
*For any* consolidated contact response, the emails and phoneNumbers arrays should be ordered with the primary contact's values first, followed by secondary contacts' values in ascending order of createdAt timestamp.
**Validates: Requirements 7.6, 7.7**

### Property 23: Transaction Rollback on Failure
*For any* identify request where a database operation fails, the system should rollback all changes, leaving the database in the same state as before the request.
**Validates: Requirements 8.3**

## Error Handling

### Input Validation Errors

**Empty Request Body**
- HTTP Status: 400 Bad Request
- Response: `{"error": "Email or phoneNumber must be provided"}`
- Occurs when both email and phoneNumber are null or missing

**Invalid JSON**
- HTTP Status: 400 Bad Request
- Response: `{"error": "Invalid JSON in request body"}`
- Occurs when request body is not valid JSON

**Invalid Data Types**
- HTTP Status: 400 Bad Request
- Response: `{"error": "Email must be a string"}`
- Occurs when email or phoneNumber are not strings

### Database Errors

**Connection Failure**
- HTTP Status: 503 Service Unavailable
- Response: `{"error": "Database connection failed"}`
- Occurs when database is unreachable
- Action: Log error, return error response, do not retry automatically

**Transaction Failure**
- HTTP Status: 500 Internal Server Error
- Response: `{"error": "Failed to process identity reconciliation"}`
- Occurs when database transaction fails or times out
- Action: Rollback transaction, log error with details, return error response

**Constraint Violation**
- HTTP Status: 500 Internal Server Error
- Response: `{"error": "Database constraint violation"}`
- Occurs when database constraints are violated (should not happen with correct logic)
- Action: Rollback transaction, log error with full details for debugging

### Concurrency Handling

**Optimistic Locking**
- Use database transactions with appropriate isolation level
- Retry logic not implemented at application level (rely on database)
- If concurrent modifications cause conflicts, one transaction will fail and rollback

**Race Condition Scenarios**
1. Two requests creating the same new contact simultaneously
   - One will succeed, one may create a duplicate or fail
   - Acceptable: duplicates will be merged on next identify call
   
2. Two requests merging different primary contacts simultaneously
   - Both transactions will complete, but may result in inconsistent state
   - Mitigation: Use serializable transaction isolation level for merge operations

## Testing Strategy

### Unit Testing

Unit tests will focus on specific examples, edge cases, and error conditions:

**Controller Layer Tests:**
- Valid request handling with email only
- Valid request handling with phoneNumber only
- Valid request handling with both email and phoneNumber
- Invalid request with missing email and phoneNumber (edge case)
- Invalid request with malformed JSON (edge case)
- Response formatting correctness

**Service Layer Tests:**
- Creating first contact (no matches)
- Creating secondary contact when partial match exists
- Merging two primary contacts
- Consolidating contact information
- Handling null values in contact data (edge case)
- Error propagation from repository layer

**Repository Layer Tests:**
- Finding contacts by email
- Finding contacts by phoneNumber
- Creating contacts with valid data
- Updating contact linkPrecedence and linkedId
- Transaction rollback on error
- Handling database connection failures (edge case)

### Property-Based Testing

Property-based tests will verify universal properties across randomized inputs. Each test will run a minimum of 100 iterations.

**Test Configuration:**
- Framework: fast-check (for TypeScript/JavaScript)
- Iterations per test: 100 minimum
- Each test tagged with: `Feature: bitespeed-identity-reconciliation, Property {N}: {property text}`

**Property Test Suite:**

1. **Property 1: Request Body Validation**
   - Generate: Random valid contact info (email and/or phone)
   - Verify: Endpoint accepts and processes request
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 1: Request Body Validation`

2. **Property 2: Response Structure Conformance**
   - Generate: Random valid requests
   - Verify: Response matches required schema
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 2: Response Structure Conformance`

3. **Property 3: Link Precedence Validity**
   - Generate: Random contact operations
   - Verify: All contacts have linkPrecedence of "primary" or "secondary"
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 3: Link Precedence Validity`

4. **Property 4: Primary Contact Invariant**
   - Generate: Random contact operations
   - Verify: All primary contacts have linkedId=null
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 4: Primary Contact Invariant`

5. **Property 5: Secondary Contact Invariant**
   - Generate: Random contact operations
   - Verify: All secondary contacts have linkedId pointing to valid primary
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 5: Secondary Contact Invariant`

6. **Property 8: New Contact Creation Round Trip**
   - Generate: Random new contact info (guaranteed no matches)
   - Verify: Created contact stores exact values provided
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 8: New Contact Creation Round Trip`

7. **Property 11: OR Matching Logic**
   - Generate: Random contacts, then query with email OR phone
   - Verify: Results include all contacts matching either field
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 11: OR Matching Logic`

8. **Property 12: Secondary Contact Creation for New Email**
   - Generate: Existing contact with phone, new email
   - Verify: Secondary contact created with new email
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 12: Secondary Contact Creation for New Email`

9. **Property 13: Secondary Contact Creation for New Phone**
   - Generate: Existing contact with email, new phone
   - Verify: Secondary contact created with new phone
   - Tag: `Feature: bitespeed-identity-reconciliation, Property 13: Secondary Contact Creation for New Phone`

10. **Property 15: Primary Contact Merging**
    - Generate: Two separate primary contacts
    - Verify: Calling identify with both merges them correctly
    - Tag: `Feature: bitespeed-identity-reconciliation, Property 15: Primary Contact Merging`

11. **Property 16: Child Relinking During Merge**
    - Generate: Primary with children, merge with older primary
    - Verify: All children now point to older primary
    - Tag: `Feature: bitespeed-identity-reconciliation, Property 16: Child Relinking During Merge`

12. **Property 18: Consolidated Contact Completeness**
    - Generate: Random identity trees
    - Verify: Consolidation includes all information
    - Tag: `Feature: bitespeed-identity-reconciliation, Property 18: Consolidated Contact Completeness`

13. **Property 19: Email Uniqueness and Completeness**
    - Generate: Random identity trees with duplicate emails
    - Verify: Response contains unique emails only, no nulls
    - Tag: `Feature: bitespeed-identity-reconciliation, Property 19: Email Uniqueness and Completeness`

14. **Property 20: Phone Number Uniqueness and Completeness**
    - Generate: Random identity trees with duplicate phones
    - Verify: Response contains unique phones only, no nulls
    - Tag: `Feature: bitespeed-identity-reconciliation, Property 20: Phone Number Uniqueness and Completeness`

15. **Property 22: Contact Information Ordering**
    - Generate: Random identity trees
    - Verify: Primary contact info appears first, then ordered by createdAt
    - Tag: `Feature: bitespeed-identity-reconciliation, Property 22: Contact Information Ordering`

### Integration Testing

Integration tests will verify end-to-end functionality:

- Complete flow: new contact creation through API
- Complete flow: secondary contact creation through API
- Complete flow: primary contact merging through API
- Database transaction behavior with real database
- Concurrent request handling (limited testing)

### Test Data Generation

For property-based tests, generators will create:

**Contact Generators:**
- Random email addresses (valid format)
- Random phone numbers (valid format)
- Random contact records with valid field combinations
- Random identity trees (primary with N secondaries)

**Edge Case Generators:**
- Null email or phone (but not both)
- Empty strings (should be treated as invalid)
- Very long email/phone strings
- Special characters in email/phone
- Duplicate emails across contacts
- Duplicate phones across contacts

### Coverage Goals

- Unit test coverage: 80%+ of service and repository logic
- Property test coverage: All 23 correctness properties
- Integration test coverage: All major user flows
- Edge case coverage: All identified edge cases from requirements
