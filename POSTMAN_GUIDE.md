# Postman Testing Guide

## Setup Instructions

### Step 1: Import the Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `Bitespeed_Identity_API.postman_collection.json` from this project
5. Click **Import**

### Step 2: Start the Server

Before testing, make sure the server is running:

```bash
npm start
```

You should see: `Server is running on port 3000`

### Step 3: Verify Connection

In Postman, send the first request "1. Create New Contact" to verify the server is responding.

---

## Testing Workflow

### Test Sequence (Recommended Order)

Follow these requests in order to see the full identity reconciliation flow:

#### 1️⃣ **Create New Contact**
- **What it does:** Creates the first primary contact
- **Request Body:**
  ```json
  {
    "email": "alice@example.com",
    "phoneNumber": "1234567890"
  }
  ```
- **Expected Response:**
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
- **✅ Success Criteria:** Status 200, primaryContactId is 1, no secondary contacts

---

#### 2️⃣ **Add New Email to Existing Contact**
- **What it does:** Links a new email to the existing contact
- **Request Body:**
  ```json
  {
    "email": "alice.work@example.com",
    "phoneNumber": "1234567890"
  }
  ```
- **Expected Response:**
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
- **✅ Success Criteria:** Status 200, two emails, one secondary contact (ID: 2)

---

#### 3️⃣ **Add New Phone to Existing Contact**
- **What it does:** Links a new phone number to the existing contact
- **Request Body:**
  ```json
  {
    "email": "alice@example.com",
    "phoneNumber": "9876543210"
  }
  ```
- **Expected Response:**
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
- **✅ Success Criteria:** Status 200, two phone numbers, two secondary contacts

---

#### 4️⃣ **Query Existing Contact (Email Only)**
- **What it does:** Retrieves contact info using only email
- **Request Body:**
  ```json
  {
    "email": "alice@example.com"
  }
  ```
- **Expected Response:** Same consolidated data as previous request
- **✅ Success Criteria:** Status 200, returns all linked information

---

#### 5️⃣ **Query Existing Contact (Phone Only)**
- **What it does:** Retrieves contact info using only phone number
- **Request Body:**
  ```json
  {
    "phoneNumber": "1234567890"
  }
  ```
- **Expected Response:** Same consolidated data
- **✅ Success Criteria:** Status 200, returns all linked information

---

#### 6️⃣ **Create Second Primary Contact**
- **What it does:** Creates a completely separate identity (Bob)
- **Request Body:**
  ```json
  {
    "email": "bob@example.com",
    "phoneNumber": "5555555555"
  }
  ```
- **Expected Response:**
  ```json
  {
    "contact": {
      "primaryContactId": 4,
      "emails": ["bob@example.com"],
      "phoneNumbers": ["5555555555"],
      "secondaryContactIds": []
    }
  }
  ```
- **✅ Success Criteria:** Status 200, new primaryContactId (4), no secondary contacts

---

#### 7️⃣ **Merge Two Primary Contacts** ⭐ (Most Important Test)
- **What it does:** Discovers Alice and Bob are the same person and merges them
- **Request Body:**
  ```json
  {
    "email": "alice@example.com",
    "phoneNumber": "5555555555"
  }
  ```
- **Expected Response:**
  ```json
  {
    "contact": {
      "primaryContactId": 1,
      "emails": ["alice@example.com", "alice.work@example.com", "bob@example.com"],
      "phoneNumbers": ["1234567890", "9876543210", "5555555555"],
      "secondaryContactIds": [2, 3, 4]
    }
  }
  ```
- **✅ Success Criteria:** 
  - Status 200
  - All emails and phones from both contacts are consolidated
  - Bob's contact (ID: 4) is now a secondary contact
  - Primary remains the older contact (ID: 1)

---

#### 8️⃣ **Error - Missing Both Fields**
- **What it does:** Tests validation error handling
- **Request Body:**
  ```json
  {}
  ```
- **Expected Response:**
  ```json
  {
    "error": "Email or phoneNumber must be provided"
  }
  ```
- **✅ Success Criteria:** Status 400 Bad Request

---

#### 9️⃣ **Error - Invalid Data Type**
- **What it does:** Tests type validation
- **Request Body:**
  ```json
  {
    "email": 12345,
    "phoneNumber": true
  }
  ```
- **Expected Response:**
  ```json
  {
    "error": "Email or phoneNumber must be provided"
  }
  ```
- **✅ Success Criteria:** Status 400 Bad Request

---

## Manual Testing Tips

### Using Postman Effectively

1. **Check Response Status:** Always verify the HTTP status code (200, 400, 500)

2. **Use Tests Tab:** Add automatic assertions in Postman:
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });
   
   pm.test("Response has contact object", function () {
       var jsonData = pm.response.json();
       pm.expect(jsonData).to.have.property('contact');
   });
   ```

3. **Save Responses:** Click "Save Response" to compare results over time

4. **Use Variables:** Create environment variables for dynamic testing:
   - `{{baseUrl}}` = `http://localhost:3000`
   - `{{primaryContactId}}` = extracted from responses

### Reset Database Between Tests

If you want to start fresh:

```bash
# Stop the server (Ctrl+C)

# Delete the database
rm prisma/dev.db

# Recreate and migrate
npx prisma migrate deploy

# Restart server
npm start
```

---

## Verification Checklist

After running all tests, verify:

- ✅ New contacts are created successfully
- ✅ Secondary contacts link to primary contacts
- ✅ Queries by email return correct consolidated data
- ✅ Queries by phone return correct consolidated data
- ✅ Multiple primary contacts merge correctly
- ✅ Older contact becomes primary during merge
- ✅ All emails and phones are consolidated
- ✅ Error handling works for invalid requests
- ✅ Response format matches specification

---

## Troubleshooting

### "Could not get response" Error
- **Cause:** Server is not running
- **Fix:** Run `npm start` in terminal

### Port 3000 Already in Use
- **Cause:** Another process is using port 3000
- **Fix:** Change PORT in `.env` file or stop the other process

### Unexpected Response Data
- **Cause:** Database has old data
- **Fix:** Reset database (see above)

### 500 Internal Server Error
- **Cause:** Database connection issue
- **Fix:** 
  1. Check `DATABASE_URL` in `.env`
  2. Run `npx prisma generate`
  3. Run `npx prisma migrate deploy`

---

## Advanced Testing

### Test with Different Data

Try these variations:

1. **Null values:**
   ```json
   {
     "email": "test@example.com",
     "phoneNumber": null
   }
   ```

2. **Only email:**
   ```json
   {
     "email": "test@example.com"
   }
   ```

3. **Only phone:**
   ```json
   {
     "phoneNumber": "1234567890"
   }
   ```

4. **Complex merging:** Create 3+ separate contacts and merge them progressively

---

## Expected Behavior Summary

| Scenario | Action | Result |
|----------|--------|--------|
| New email + phone | Create primary | New primary contact |
| Existing phone + new email | Create secondary | Secondary linked to primary |
| Existing email + new phone | Create secondary | Secondary linked to primary |
| Both exist | Return consolidation | No new contact created |
| Two primaries matched | Merge | Newer becomes secondary |
| Missing both fields | Validation error | 400 Bad Request |

---

## Need Help?

If tests are failing:
1. Check server logs in terminal
2. Verify database state: `sqlite3 prisma/dev.db "SELECT * FROM Contact;"`
3. Review the TESTING.md file for more details
4. Ensure all dependencies are installed: `npm install`
