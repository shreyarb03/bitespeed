# Requirements Document

## Introduction

The Bitespeed Identity Reconciliation service is a backend web service that maintains and reconciles customer contact information across multiple touchpoints. When customers interact with a business using different email addresses or phone numbers, this service links these identities together to provide a unified view of each customer.

## Glossary

- **Contact**: A database record representing a customer identity with email and/or phone number
- **Primary_Contact**: A Contact with linkPrecedence="primary" that serves as the main identity record
- **Secondary_Contact**: A Contact with linkPrecedence="secondary" that is linked to a Primary_Contact via linkedId
- **Identity_Reconciliation**: The process of linking multiple Contact records that belong to the same person
- **Identify_Endpoint**: The HTTP POST endpoint `/identify` that receives contact information and returns consolidated identity data
- **Contact_Database**: The SQL database table storing all Contact records
- **Consolidated_Contact**: The aggregated view of a customer showing all linked emails, phone numbers, and contact IDs

## Requirements

### Requirement 1: HTTP Endpoint

**User Story:** As a client application, I want to send contact information to an HTTP endpoint, so that I can retrieve consolidated identity information.

#### Acceptance Criteria

1. THE Identify_Endpoint SHALL accept HTTP POST requests at the path `/identify`
2. WHEN a POST request is received, THE Identify_Endpoint SHALL expect a JSON body containing email and/or phoneNumber fields
3. WHEN both email and phoneNumber are null or missing, THE Identify_Endpoint SHALL return an error response
4. WHEN valid contact information is provided, THE Identify_Endpoint SHALL return a JSON response with consolidated contact information
5. THE Identify_Endpoint SHALL return responses in the format: `{"contact": {"primaryContactId": number, "emails": [string], "phoneNumbers": [string], "secondaryContactIds": [number]}}`

### Requirement 2: Contact Database Schema

**User Story:** As the system, I want to store contact information in a structured database, so that I can efficiently query and link related contacts.

#### Acceptance Criteria

1. THE Contact_Database SHALL have a table named "Contact" with the following fields: id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
2. THE Contact_Database SHALL use id as an auto-incrementing primary key
3. THE Contact_Database SHALL allow phoneNumber to be null
4. THE Contact_Database SHALL allow email to be null
5. THE Contact_Database SHALL store linkPrecedence as either "primary" or "secondary"
6. WHEN a Contact is a Primary_Contact, THE linkedId field SHALL be null
7. WHEN a Contact is a Secondary_Contact, THE linkedId field SHALL reference the id of its Primary_Contact
8. THE Contact_Database SHALL automatically set createdAt timestamp when a new Contact is created
9. THE Contact_Database SHALL automatically update updatedAt timestamp when a Contact is modified

### Requirement 3: New Contact Creation

**User Story:** As the system, I want to create new contact records when no existing match is found, so that I can track new customer identities.

#### Acceptance Criteria

1. WHEN the Identify_Endpoint receives contact information with no matching email or phoneNumber in the Contact_Database, THE System SHALL create a new Primary_Contact
2. WHEN creating a new Primary_Contact, THE System SHALL set linkPrecedence to "primary"
3. WHEN creating a new Primary_Contact, THE System SHALL set linkedId to null
4. WHEN creating a new Contact, THE System SHALL store the provided email and phoneNumber values

### Requirement 4: Identity Matching

**User Story:** As the system, I want to identify existing contacts that match provided information, so that I can link related identities.

#### Acceptance Criteria

1. WHEN the Identify_Endpoint receives an email, THE System SHALL search the Contact_Database for any Contact with matching email
2. WHEN the Identify_Endpoint receives a phoneNumber, THE System SHALL search the Contact_Database for any Contact with matching phoneNumber
3. WHEN both email and phoneNumber are provided, THE System SHALL search for Contacts matching either field
4. THE System SHALL consider a match found if any Contact shares the provided email OR phoneNumber

### Requirement 5: Secondary Contact Creation

**User Story:** As the system, I want to create secondary contacts when new information is provided for existing contacts, so that I can track all known contact methods for a customer.

#### Acceptance Criteria

1. WHEN the Identify_Endpoint receives contact information where only the email matches an existing Contact but the phoneNumber is new, THE System SHALL create a new Secondary_Contact with the new phoneNumber
2. WHEN the Identify_Endpoint receives contact information where only the phoneNumber matches an existing Contact but the email is new, THE System SHALL create a new Secondary_Contact with the new email
3. WHEN creating a Secondary_Contact, THE System SHALL set linkPrecedence to "secondary"
4. WHEN creating a Secondary_Contact, THE System SHALL set linkedId to the id of the Primary_Contact in the identity chain
5. WHEN the matched Contact is itself a Secondary_Contact, THE System SHALL use its linkedId as the linkedId for the new Secondary_Contact

### Requirement 6: Primary Contact Linking

**User Story:** As the system, I want to link separate primary contacts when they are discovered to belong to the same person, so that I can maintain a single unified identity.

#### Acceptance Criteria

1. WHEN the Identify_Endpoint receives contact information that matches two different Primary_Contacts (one by email, one by phoneNumber), THE System SHALL link them together
2. WHEN linking two Primary_Contacts, THE System SHALL convert the newer Primary_Contact to a Secondary_Contact
3. WHEN converting a Primary_Contact to Secondary_Contact, THE System SHALL update its linkPrecedence to "secondary"
4. WHEN converting a Primary_Contact to Secondary_Contact, THE System SHALL set its linkedId to the id of the older Primary_Contact
5. WHEN a Primary_Contact is converted to Secondary_Contact, THE System SHALL update all its existing Secondary_Contacts to point to the older Primary_Contact
6. THE System SHALL determine age by comparing createdAt timestamps, with earlier timestamps being older

### Requirement 7: Contact Consolidation

**User Story:** As a client application, I want to receive all known contact information for a customer in a single response, so that I can display a complete customer profile.

#### Acceptance Criteria

1. WHEN the Identify_Endpoint processes a request, THE System SHALL return a Consolidated_Contact containing all linked identity information
2. THE Consolidated_Contact SHALL include the primaryContactId as the id of the Primary_Contact
3. THE Consolidated_Contact SHALL include an emails array containing all unique email addresses from the Primary_Contact and all linked Secondary_Contacts
4. THE Consolidated_Contact SHALL include a phoneNumbers array containing all unique phone numbers from the Primary_Contact and all linked Secondary_Contacts
5. THE Consolidated_Contact SHALL include a secondaryContactIds array containing the ids of all Secondary_Contacts linked to the Primary_Contact
6. THE System SHALL order emails with the Primary_Contact email first, followed by Secondary_Contact emails in order of createdAt
7. THE System SHALL order phoneNumbers with the Primary_Contact phoneNumber first, followed by Secondary_Contact phoneNumbers in order of createdAt
8. THE System SHALL exclude null values from the emails and phoneNumbers arrays

### Requirement 8: Data Integrity

**User Story:** As the system, I want to maintain data consistency during concurrent requests, so that identity links remain accurate.

#### Acceptance Criteria

1. WHEN multiple requests are processed simultaneously for the same contact, THE System SHALL ensure database operations are atomic
2. WHEN updating Contact records, THE System SHALL use database transactions to maintain consistency
3. WHEN a database operation fails, THE System SHALL rollback all changes from that request
4. THE System SHALL handle race conditions when creating or updating Contact records

### Requirement 9: Technology Stack

**User Story:** As a developer, I want to use specified technologies, so that the implementation meets project requirements.

#### Acceptance Criteria

1. THE System SHALL be implemented using Node.js with TypeScript
2. THE System SHALL use a SQL database (PostgreSQL, MySQL, or SQLite)
3. THE System SHALL use an appropriate web framework for handling HTTP requests
4. THE System SHALL use an appropriate ORM or query builder for database operations
