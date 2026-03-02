# Implementation Plan: Bitespeed Identity Reconciliation

## Overview

This implementation plan breaks down the Bitespeed Identity Reconciliation service into incremental coding tasks. The approach follows a bottom-up strategy: starting with database setup and data models, then building the service layer logic, and finally wiring everything together with the HTTP API layer. Each task builds on previous work to ensure continuous integration.

## Tasks

- [x] 1. Project setup and database configuration
  - Initialize Node.js TypeScript project with necessary dependencies (Express, Prisma, testing frameworks)
  - Configure Prisma with SQLite for development (can be changed to PostgreSQL/MySQL later)
  - Create Prisma schema for Contact table with all required fields and constraints
  - Generate Prisma client and run initial migration
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4_

- [ ]* 1.1 Write property test for database schema constraints
  - **Property 3: Link Precedence Validity**
  - **Validates: Requirements 2.5**

- [x] 2. Implement Contact repository layer
  - [x] 2.1 Create ContactRepository class with Prisma client integration
    - Implement findByEmail method to query contacts by email
    - Implement findByPhoneNumber method to query contacts by phone number
    - Implement findByEmailOrPhoneNumber method for OR queries
    - Implement findById method to get contact by ID
    - Implement findAllLinked method to get all secondary contacts for a primary
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.2 Implement contact creation and update methods
    - Implement create method with automatic timestamp handling
    - Implement update method with automatic updatedAt handling
    - Implement updateMany method for bulk updates
    - Implement transaction wrapper method
    - _Requirements: 2.8, 2.9, 3.4, 8.2_

  - [ ]* 2.3 Write unit tests for repository methods
    - Test findByEmail with existing and non-existing emails
    - Test findByPhoneNumber with existing and non-existing phones
    - Test create with valid data
    - Test update with valid changes
    - Test transaction rollback on error (edge case)
    - _Requirements: 4.1, 4.2, 2.8, 2.9, 8.3_

  - [ ]* 2.4 Write property test for timestamp creation
    - **Property 6: Timestamp Creation**
    - **Validates: Requirements 2.8**

  - [ ]* 2.5 Write property test for timestamp updates
    - **Property 7: Timestamp Update**
    - **Validates: Requirements 2.9**

- [x] 3. Implement core identity reconciliation service
  - [x] 3.1 Create IdentityService class with contact matching logic
    - Implement findMatchingContacts method using repository OR queries
    - Implement logic to collect all contacts matching email or phoneNumber
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.2 Write property test for OR matching logic
    - **Property 11: OR Matching Logic**
    - **Validates: Requirements 4.3**

  - [x] 3.3 Implement primary contact determination logic
    - Implement determinePrimaryContact method to find oldest primary from matches
    - Handle case where matches are all secondary (traverse to their primary)
    - Handle case where no matches exist (return null)
    - _Requirements: 6.6_

  - [ ]* 3.4 Write property test for age determination
    - **Property 17: Age Determination by Timestamp**
    - **Validates: Requirements 6.6**

  - [x] 3.5 Implement new contact creation logic
    - Implement createNewContact method for creating primary contacts when no matches exist
    - Ensure linkPrecedence is set to "primary" and linkedId is null
    - Store provided email and phoneNumber values
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 3.6 Write property test for new contact creation
    - **Property 8: New Contact Creation Round Trip**
    - **Validates: Requirements 3.1, 3.4**

  - [ ]* 3.7 Write property test for primary contact invariant
    - **Property 4: Primary Contact Invariant**
    - **Validates: Requirements 2.6, 3.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement secondary contact creation logic
  - [x] 5.1 Implement logic to detect new information in requests
    - Create method to check if email is new (not in any matched contacts)
    - Create method to check if phoneNumber is new (not in any matched contacts)
    - Determine when to create secondary contact vs. return existing consolidation
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Implement createSecondaryContact method
    - Set linkPrecedence to "secondary"
    - Set linkedId to the primary contact's ID
    - Handle case where matched contact is itself secondary (use its linkedId)
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]* 5.3 Write property test for secondary contact creation with new email
    - **Property 12: Secondary Contact Creation for New Email**
    - **Validates: Requirements 5.1**

  - [ ]* 5.4 Write property test for secondary contact creation with new phone
    - **Property 13: Secondary Contact Creation for New Phone**
    - **Validates: Requirements 5.2**

  - [ ]* 5.5 Write property test for secondary contact invariant
    - **Property 5: Secondary Contact Invariant**
    - **Validates: Requirements 2.7, 5.4**

  - [ ]* 5.6 Write property test for secondary contacts pointing to primary
    - **Property 14: Secondary Contacts Point to Primary**
    - **Validates: Requirements 5.5**

- [ ] 6. Implement primary contact merging logic
  - [x] 6.1 Implement logic to detect multiple primary contacts in matches
    - Create method to identify when matches contain multiple distinct primary contacts
    - Determine which primary is older based on createdAt timestamp
    - _Requirements: 6.1, 6.6_

  - [x] 6.2 Implement linkContacts method for merging primary contacts
    - Convert newer primary to secondary (update linkPrecedence and linkedId)
    - Find all secondary contacts of the newer primary
    - Update all those secondaries to point to the older primary (updateMany)
    - Wrap all operations in a database transaction
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 8.2_

  - [ ]* 6.3 Write property test for primary contact merging
    - **Property 15: Primary Contact Merging**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [ ]* 6.4 Write property test for child relinking during merge
    - **Property 16: Child Relinking During Merge**
    - **Validates: Requirements 6.5**

- [ ] 7. Implement contact consolidation logic
  - [x] 7.1 Implement consolidateContacts method
    - Fetch primary contact and all linked secondary contacts
    - Collect all unique emails (excluding nulls) in order
    - Collect all unique phoneNumbers (excluding nulls) in order
    - Collect all secondary contact IDs
    - Ensure primary contact's email/phone appear first, then order by createdAt
    - Return ConsolidatedContact object
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 7.2 Write property test for consolidated contact completeness
    - **Property 18: Consolidated Contact Completeness**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 7.3 Write property test for email uniqueness and completeness
    - **Property 19: Email Uniqueness and Completeness**
    - **Validates: Requirements 7.3, 7.8**

  - [ ]* 7.4 Write property test for phone number uniqueness and completeness
    - **Property 20: Phone Number Uniqueness and Completeness**
    - **Validates: Requirements 7.4, 7.8**

  - [ ]* 7.5 Write property test for secondary contact IDs completeness
    - **Property 21: Secondary Contact IDs Completeness**
    - **Validates: Requirements 7.5**

  - [ ]* 7.6 Write property test for contact information ordering
    - **Property 22: Contact Information Ordering**
    - **Validates: Requirements 7.6, 7.7**

- [ ] 8. Implement main reconcileIdentity orchestration method
  - [x] 8.1 Wire together all reconciliation logic in reconcileIdentity method
    - Call findMatchingContacts with provided email/phoneNumber
    - If no matches, create new primary contact and return consolidation
    - If matches exist, determine primary contact
    - Check if new information exists (new email or phone)
    - If multiple primaries detected, merge them
    - If new information exists, create secondary contact
    - Return consolidated contact information
    - Wrap entire operation in database transaction
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 7.1, 8.2_

  - [ ]* 8.2 Write unit tests for reconcileIdentity scenarios
    - Test scenario: no existing contacts (creates new primary)
    - Test scenario: exact match exists (returns consolidation)
    - Test scenario: partial match with new email (creates secondary)
    - Test scenario: partial match with new phone (creates secondary)
    - Test scenario: two primaries matched (merges them)
    - _Requirements: 3.1, 5.1, 5.2, 6.1_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement HTTP API layer
  - [x] 10.1 Create Express application and configure middleware
    - Set up Express app with JSON body parser
    - Configure error handling middleware
    - Set up basic logging
    - _Requirements: 9.3_

  - [x] 10.2 Implement IdentityController with /identify endpoint
    - Create POST /identify route handler
    - Validate request body (email and/or phoneNumber present)
    - Return 400 error if both are null/missing
    - Call IdentityService.reconcileIdentity with validated input
    - Format response according to API specification
    - Handle errors and return appropriate HTTP status codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 10.3 Write unit tests for controller
    - Test valid request with email only
    - Test valid request with phoneNumber only
    - Test valid request with both email and phoneNumber
    - Test invalid request with missing email and phoneNumber (edge case)
    - Test invalid request with malformed JSON (edge case)
    - Test response formatting
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 10.4 Write property test for request body validation
    - **Property 1: Request Body Validation**
    - **Validates: Requirements 1.2**

  - [ ]* 10.5 Write property test for response structure conformance
    - **Property 2: Response Structure Conformance**
    - **Validates: Requirements 1.5**

- [-] 11. Implement error handling
  - [x] 11.1 Add error handling for database failures
    - Catch database connection errors and return 503
    - Catch transaction failures and return 500
    - Ensure transaction rollback on any error
    - Log all errors with appropriate detail
    - _Requirements: 8.3_

  - [x] 11.2 Add input validation error handling
    - Return 400 for invalid JSON
    - Return 400 for invalid data types
    - Return 400 for missing required fields
    - _Requirements: 1.3_

  - [ ]* 11.3 Write property test for transaction rollback
    - **Property 23: Transaction Rollback on Failure**
    - **Validates: Requirements 8.3**

  - [ ]* 11.4 Write unit tests for error scenarios
    - Test database connection failure (edge case)
    - Test transaction rollback behavior
    - Test invalid JSON handling (edge case)
    - Test invalid data types (edge case)
    - _Requirements: 8.3, 1.3_

- [ ] 12. Create application entry point and server startup
  - [x] 12.1 Create main server file
    - Initialize Prisma client
    - Create repository, service, and controller instances
    - Start Express server on configured port
    - Handle graceful shutdown
    - _Requirements: 9.1, 9.3_

  - [x] 12.2 Add environment configuration
    - Create .env file for database URL and port configuration
    - Add configuration loading logic
    - Document required environment variables
    - _Requirements: 9.2_

- [ ]* 13. Integration testing
  - [ ]* 13.1 Write integration tests for complete flows
    - Test complete flow: new contact creation through API
    - Test complete flow: secondary contact creation through API
    - Test complete flow: primary contact merging through API
    - Test with real database (SQLite in-memory for tests)
    - _Requirements: 1.1, 3.1, 5.1, 6.1_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Run all unit tests, property tests, and integration tests
  - Verify test coverage meets goals (80%+ for service/repository)
  - Ensure all 23 correctness properties are tested
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: database → service → API
- All database operations use transactions to ensure consistency
- Fast-check library will be used for property-based testing in TypeScript
