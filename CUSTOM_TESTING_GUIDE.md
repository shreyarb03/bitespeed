# Custom Test Cases Guide

## Overview

This guide shows you how to create and run your own test cases to verify the identity reconciliation service works correctly with your specific scenarios.

---

## Method 1: Using Postman (Recommended for Manual Testing)

### Creating Your Own Test Cases

1. **Open Postman** and the imported collection
2. **Duplicate any request** (right-click → Duplicate)
3. **Modify the request body** with your test data
4. **Add test assertions** in the "Tests" tab

### Example: Custom Test Case

**Scenario:** Test if the system handles multiple email addresses correctly

```javascript
// In Postman "Tests" tab, add:

pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains contact object", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('contact');
});

pm.test("Primary contact ID exists", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.contact.primaryContactId).to.be.a('number');
});

pm.test("Emails array is not empty", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.contact.emails).to.be.an('array');
    pm.expect(jsonData.contact.emails.length).to.be.above(0);
});

pm.test("All emails are unique", function () {
    var jsonData = pm.response.json();
    var emails = jsonData.contact.emails;
    var uniqueEmails = [...new Set(emails)];
    pm.expect(emails.length).to.equal(uniqueEmails.length);
});
```

### Test Case Template

Create a new request with this structure:

**Request:**
```json
{
  "email": "YOUR_EMAIL_HERE",
  "phoneNumber": "YOUR_PHONE_HERE"
}
```

**Expected Outcome:**
- Document what you expect to happen
- Note the expected primaryContactId
- List expected emails and phoneNumbers arrays
- List expected secondaryContactIds

---

## Method 2: Using curl (Command Line)

### Basic Template

```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL",
    "phoneNumber": "YOUR_PHONE"
  }' | jq
```

The `| jq` part formats the JSON response nicely (install jq: `brew install jq`)

### Example Custom Test Cases

#### Test Case 1: Three-Way Merge
```bash
# Step 1: Create contact A
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@test.com", "phoneNumber": "1111111111"}' | jq

# Step 2: Create contact B
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "user2@test.com", "phoneNumber": "2222222222"}' | jq

# Step 3: Create contact C
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "user3@test.com", "phoneNumber": "3333333333"}' | jq

# Step 4: Link A and B
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@test.com", "phoneNumber": "2222222222"}' | jq

# Step 5: Link B and C (should merge all three)
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "user2@test.com", "phoneNumber": "3333333333"}' | jq
```

#### Test Case 2: Email-Only Contact
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "emailonly@test.com"}' | jq
```

#### Test Case 3: Phone-Only Contact
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9999999999"}' | jq
```

---

## Method 3: Writing Automated Test Scripts

### Create a Test Script File

Create `my-tests.sh`:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/identify"

echo "🧪 Running Custom Test Suite..."
echo ""

# Test 1: Create new contact
echo "Test 1: Creating new contact..."
RESPONSE=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "phoneNumber": "1234567890"}')

if echo $RESPONSE | jq -e '.contact.primaryContactId' > /dev/null; then
    echo -e "${GREEN}✓ Test 1 Passed${NC}"
else
    echo -e "${RED}✗ Test 1 Failed${NC}"
fi
echo ""

# Test 2: Add new email
echo "Test 2: Adding new email to existing contact..."
RESPONSE=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"email": "test2@example.com", "phoneNumber": "1234567890"}')

EMAIL_COUNT=$(echo $RESPONSE | jq '.contact.emails | length')
if [ "$EMAIL_COUNT" -eq 2 ]; then
    echo -e "${GREEN}✓ Test 2 Passed (2 emails found)${NC}"
else
    echo -e "${RED}✗ Test 2 Failed (expected 2 emails, got $EMAIL_COUNT)${NC}"
fi
echo ""

# Test 3: Verify consolidation
echo "Test 3: Verifying contact consolidation..."
RESPONSE=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}')

SECONDARY_COUNT=$(echo $RESPONSE | jq '.contact.secondaryContactIds | length')
if [ "$SECONDARY_COUNT" -ge 1 ]; then
    echo -e "${GREEN}✓ Test 3 Passed (found $SECONDARY_COUNT secondary contacts)${NC}"
else
    echo -e "${RED}✗ Test 3 Failed${NC}"
fi
echo ""

echo "🏁 Test suite completed!"
```

Make it executable and run:
```bash
chmod +x my-tests.sh
./my-tests.sh
```

---

## Method 4: Database Inspection

### Check Database State After Each Test

```bash
# Open SQLite database
sqlite3 prisma/dev.db

# View all contacts
SELECT * FROM Contact;

# View in a formatted way
.mode column
.headers on
SELECT id, email, phoneNumber, linkedId, linkPrecedence, createdAt FROM Contact;

# Count contacts by type
SELECT linkPrecedence, COUNT(*) as count FROM Contact GROUP BY linkPrecedence;

# View contact relationships
SELECT 
    c.id as contact_id,
    c.email,
    c.phoneNumber,
    c.linkPrecedence,
    c.linkedId,
    p.email as primary_email
FROM Contact c
LEFT JOIN Contact p ON c.linkedId = p.id
ORDER BY COALESCE(c.linkedId, c.id), c.id;

# Exit SQLite
.quit
```

### Verification Queries

**Check if a contact is properly linked:**
```sql
SELECT * FROM Contact WHERE email = 'your-email@example.com';
```

**Find all contacts in a family:**
```sql
-- Replace 1 with your primary contact ID
SELECT * FROM Contact 
WHERE id = 1 OR linkedId = 1 
ORDER BY createdAt;
```

**Verify no orphaned secondary contacts:**
```sql
SELECT * FROM Contact 
WHERE linkPrecedence = 'secondary' 
AND linkedId NOT IN (SELECT id FROM Contact WHERE linkPrecedence = 'primary');
```

---

## Method 5: Create Custom Test Scenarios

### Test Scenario Template

For each test case, document:

1. **Test Name:** Descriptive name
2. **Objective:** What you're testing
3. **Preconditions:** Database state before test
4. **Steps:** Sequence of API calls
5. **Expected Result:** What should happen
6. **Actual Result:** What actually happened
7. **Status:** Pass/Fail

### Example Test Scenario

**Test Name:** Multiple Phone Numbers for Same Email

**Objective:** Verify that multiple phone numbers can be linked to the same email address

**Preconditions:** Empty database

**Steps:**
1. POST `{"email": "john@example.com", "phoneNumber": "1111111111"}`
2. POST `{"email": "john@example.com", "phoneNumber": "2222222222"}`
3. POST `{"email": "john@example.com", "phoneNumber": "3333333333"}`
4. POST `{"email": "john@example.com"}` (query)

**Expected Result:**
- Step 1: Creates primary contact (ID: 1)
- Step 2: Creates secondary contact (ID: 2) linked to ID: 1
- Step 3: Creates secondary contact (ID: 3) linked to ID: 1
- Step 4: Returns consolidated contact with:
  - primaryContactId: 1
  - emails: ["john@example.com"]
  - phoneNumbers: ["1111111111", "2222222222", "3333333333"]
  - secondaryContactIds: [2, 3]

**Actual Result:** (Fill in after running)

**Status:** (Pass/Fail)

---

## Method 6: Using a Test Data Generator

### Create Test Data Script

Create `generate-test-data.js`:

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/identify';

async function testCase(name, data, expectedPrimaryId = null) {
  console.log(`\n🧪 ${name}`);
  console.log('Request:', JSON.stringify(data, null, 2));
  
  try {
    const response = await axios.post(BASE_URL, data);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (expectedPrimaryId && response.data.contact.primaryContactId !== expectedPrimaryId) {
      console.log(`❌ FAIL: Expected primaryContactId ${expectedPrimaryId}, got ${response.data.contact.primaryContactId}`);
    } else {
      console.log('✅ PASS');
    }
    
    return response.data;
  } catch (error) {
    console.log('❌ ERROR:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Custom Test Suite\n');
  
  // Your custom test cases here
  await testCase('Test 1: Create first contact', {
    email: 'alice@example.com',
    phoneNumber: '1234567890'
  }, 1);
  
  await testCase('Test 2: Add new email', {
    email: 'alice.work@example.com',
    phoneNumber: '1234567890'
  }, 1);
  
  await testCase('Test 3: Add new phone', {
    email: 'alice@example.com',
    phoneNumber: '9876543210'
  }, 1);
  
  // Add more test cases...
  
  console.log('\n✨ Test suite completed!');
}

runTests();
```

Run with:
```bash
npm install axios  # If not already installed
node generate-test-data.js
```

---

## Test Case Ideas

Here are scenarios you might want to test:

### Basic Scenarios
- ✅ Create contact with email only
- ✅ Create contact with phone only
- ✅ Create contact with both email and phone
- ✅ Query existing contact by email
- ✅ Query existing contact by phone

### Linking Scenarios
- ✅ Add second email to existing contact
- ✅ Add second phone to existing contact
- ✅ Add multiple emails to same phone
- ✅ Add multiple phones to same email

### Merging Scenarios
- ✅ Merge two primary contacts
- ✅ Merge three primary contacts progressively
- ✅ Merge contacts with multiple secondaries each

### Edge Cases
- ✅ Same email and phone (should not create duplicate)
- ✅ Null email with valid phone
- ✅ Valid email with null phone
- ✅ Empty strings (should fail validation)
- ✅ Very long email/phone strings
- ✅ Special characters in email

### Complex Scenarios
- ✅ Chain of links: A→B, B→C, C→D
- ✅ Diamond pattern: A→B, A→C, B→D, C→D
- ✅ Multiple merges in sequence

---

## Verification Checklist

After running your custom tests, verify:

- [ ] All primary contacts have linkedId = null
- [ ] All secondary contacts have valid linkedId pointing to a primary
- [ ] No duplicate emails in consolidated response
- [ ] No duplicate phones in consolidated response
- [ ] Emails are ordered correctly (primary first, then by createdAt)
- [ ] Phone numbers are ordered correctly (primary first, then by createdAt)
- [ ] Secondary contact IDs array matches actual secondary contacts
- [ ] Older contact always becomes primary during merge
- [ ] All children are relinked during merge

---

## Debugging Failed Tests

If a test fails:

1. **Check the response:**
   ```bash
   curl -v http://localhost:3000/identify -H "Content-Type: application/json" -d '{"email":"test@test.com"}'
   ```

2. **Check server logs:** Look at the terminal where `npm start` is running

3. **Check database state:**
   ```bash
   sqlite3 prisma/dev.db "SELECT * FROM Contact;"
   ```

4. **Reset and retry:**
   ```bash
   rm prisma/dev.db
   npx prisma migrate deploy
   npm start
   ```

---

## Tips for Effective Testing

1. **Start Simple:** Test basic cases before complex scenarios
2. **Document Everything:** Keep notes on what you tested and results
3. **Reset Between Suites:** Clear database between major test runs
4. **Use Consistent Data:** Use predictable emails/phones for easier debugging
5. **Test Edge Cases:** Don't just test happy paths
6. **Verify Database:** Always check database state matches API responses
7. **Automate Repetitive Tests:** Use scripts for tests you run often

---

## Need Help?

If you're stuck:
- Check server logs for error messages
- Verify database schema: `sqlite3 prisma/dev.db ".schema Contact"`
- Review the requirements.md and design.md files
- Run the automated test suite: `npm test`
