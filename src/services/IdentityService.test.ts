import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ContactRepository } from '../repositories/ContactRepository';
import { IdentityService } from './IdentityService';

describe('IdentityService - reconcileIdentity', () => {
  let prisma: PrismaClient;
  let repository: ContactRepository;
  let service: IdentityService;

  beforeEach(async () => {
    prisma = new PrismaClient();
    repository = new ContactRepository(prisma);
    service = new IdentityService(repository);

    // Clean up database before each test
    await prisma.contact.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create new primary contact when no matches exist', async () => {
    const result = await service.reconcileIdentity('new@example.com', '1234567890');

    expect(result.primaryContactId).toBeDefined();
    expect(result.emails).toEqual(['new@example.com']);
    expect(result.phoneNumbers).toEqual(['1234567890']);
    expect(result.secondaryContactIds).toEqual([]);

    // Verify contact was created in database
    const contact = await repository.findById(result.primaryContactId);
    expect(contact).not.toBeNull();
    expect(contact!.linkPrecedence).toBe('primary');
    expect(contact!.linkedId).toBeNull();
  });

  it('should return existing consolidation when exact match exists', async () => {
    // Create an existing primary contact
    const existing = await repository.create({
      email: 'existing@example.com',
      phoneNumber: '1234567890',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    const result = await service.reconcileIdentity('existing@example.com', '1234567890');

    expect(result.primaryContactId).toBe(existing.id);
    expect(result.emails).toEqual(['existing@example.com']);
    expect(result.phoneNumbers).toEqual(['1234567890']);
    expect(result.secondaryContactIds).toEqual([]);
  });

  it('should create secondary contact when partial match with new email', async () => {
    // Create an existing primary contact with phone only
    const existing = await repository.create({
      email: null,
      phoneNumber: '1234567890',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    const result = await service.reconcileIdentity('newemail@example.com', '1234567890');

    expect(result.primaryContactId).toBe(existing.id);
    expect(result.emails).toEqual(['newemail@example.com']);
    expect(result.phoneNumbers).toEqual(['1234567890']);
    expect(result.secondaryContactIds.length).toBe(1);

    // Verify secondary contact was created
    const secondary = await repository.findById(result.secondaryContactIds[0]);
    expect(secondary).not.toBeNull();
    expect(secondary!.linkPrecedence).toBe('secondary');
    expect(secondary!.linkedId).toBe(existing.id);
    expect(secondary!.email).toBe('newemail@example.com');
  });

  it('should create secondary contact when partial match with new phone', async () => {
    // Create an existing primary contact with email only
    const existing = await repository.create({
      email: 'existing@example.com',
      phoneNumber: null,
      linkPrecedence: 'primary',
      linkedId: null,
    });

    const result = await service.reconcileIdentity('existing@example.com', '9876543210');

    expect(result.primaryContactId).toBe(existing.id);
    expect(result.emails).toEqual(['existing@example.com']);
    expect(result.phoneNumbers).toEqual(['9876543210']);
    expect(result.secondaryContactIds.length).toBe(1);

    // Verify secondary contact was created
    const secondary = await repository.findById(result.secondaryContactIds[0]);
    expect(secondary).not.toBeNull();
    expect(secondary!.linkPrecedence).toBe('secondary');
    expect(secondary!.linkedId).toBe(existing.id);
    expect(secondary!.phoneNumber).toBe('9876543210');
  });

  it('should merge two primary contacts when both are matched', async () => {
    // Create first primary contact
    const primary1 = await repository.create({
      email: 'primary1@example.com',
      phoneNumber: null,
      linkPrecedence: 'primary',
      linkedId: null,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second primary contact
    const primary2 = await repository.create({
      email: null,
      phoneNumber: '1234567890',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    // Call reconcileIdentity with both email and phone (matches both primaries)
    const result = await service.reconcileIdentity('primary1@example.com', '1234567890');

    // Should use the older primary (primary1)
    expect(result.primaryContactId).toBe(primary1.id);
    expect(result.emails).toEqual(['primary1@example.com']);
    expect(result.phoneNumbers).toEqual(['1234567890']);
    expect(result.secondaryContactIds).toContain(primary2.id);

    // Verify primary2 was converted to secondary
    const updatedPrimary2 = await repository.findById(primary2.id);
    expect(updatedPrimary2).not.toBeNull();
    expect(updatedPrimary2!.linkPrecedence).toBe('secondary');
    expect(updatedPrimary2!.linkedId).toBe(primary1.id);
  });
});

describe('IdentityService - linkContacts', () => {
  let prisma: PrismaClient;
  let repository: ContactRepository;
  let service: IdentityService;

  beforeEach(async () => {
    prisma = new PrismaClient();
    repository = new ContactRepository(prisma);
    service = new IdentityService(repository);

    // Clean up database before each test
    await prisma.contact.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should merge two primary contacts by converting newer to secondary', async () => {
    // Create two primary contacts with different timestamps
    const olderPrimary = await repository.create({
      email: 'older@example.com',
      phoneNumber: '1111111111',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const newerPrimary = await repository.create({
      email: 'newer@example.com',
      phoneNumber: '2222222222',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    // Access the private method using type assertion
    const serviceAny = service as any;
    await serviceAny.linkContacts(olderPrimary, newerPrimary);

    // Verify newer primary was converted to secondary
    const updatedNewerPrimary = await repository.findById(newerPrimary.id);
    expect(updatedNewerPrimary).not.toBeNull();
    expect(updatedNewerPrimary!.linkPrecedence).toBe('secondary');
    expect(updatedNewerPrimary!.linkedId).toBe(olderPrimary.id);

    // Verify older primary remains primary
    const updatedOlderPrimary = await repository.findById(olderPrimary.id);
    expect(updatedOlderPrimary).not.toBeNull();
    expect(updatedOlderPrimary!.linkPrecedence).toBe('primary');
    expect(updatedOlderPrimary!.linkedId).toBeNull();
  });

  it('should update all children of newer primary to point to older primary', async () => {
    // Create older primary
    const olderPrimary = await repository.create({
      email: 'older@example.com',
      phoneNumber: '1111111111',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    // Create newer primary
    const newerPrimary = await repository.create({
      email: 'newer@example.com',
      phoneNumber: '2222222222',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    // Create secondary contacts linked to newer primary
    const child1 = await repository.create({
      email: 'child1@example.com',
      phoneNumber: '3333333333',
      linkPrecedence: 'secondary',
      linkedId: newerPrimary.id,
    });

    const child2 = await repository.create({
      email: 'child2@example.com',
      phoneNumber: '4444444444',
      linkPrecedence: 'secondary',
      linkedId: newerPrimary.id,
    });

    // Link the two primaries
    const serviceAny = service as any;
    await serviceAny.linkContacts(olderPrimary, newerPrimary);

    // Verify all children now point to older primary
    const updatedChild1 = await repository.findById(child1.id);
    expect(updatedChild1).not.toBeNull();
    expect(updatedChild1!.linkedId).toBe(olderPrimary.id);

    const updatedChild2 = await repository.findById(child2.id);
    expect(updatedChild2).not.toBeNull();
    expect(updatedChild2!.linkedId).toBe(olderPrimary.id);

    // Verify newer primary is now secondary pointing to older primary
    const updatedNewerPrimary = await repository.findById(newerPrimary.id);
    expect(updatedNewerPrimary).not.toBeNull();
    expect(updatedNewerPrimary!.linkPrecedence).toBe('secondary');
    expect(updatedNewerPrimary!.linkedId).toBe(olderPrimary.id);
  });

  it('should handle transaction rollback on error', async () => {
    // Create two primary contacts
    const olderPrimary = await repository.create({
      email: 'older@example.com',
      phoneNumber: '1111111111',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    const newerPrimary = await repository.create({
      email: 'newer@example.com',
      phoneNumber: '2222222222',
      linkPrecedence: 'primary',
      linkedId: null,
    });

    // Create a child
    const child = await repository.create({
      email: 'child@example.com',
      phoneNumber: '3333333333',
      linkPrecedence: 'secondary',
      linkedId: newerPrimary.id,
    });

    // Try to link with an invalid primary (should fail)
    const serviceAny = service as any;
    const invalidPrimary = { ...olderPrimary, id: 99999 }; // Non-existent ID

    try {
      await serviceAny.linkContacts(invalidPrimary, newerPrimary);
    } catch (error) {
      // Expected to fail
    }

    // Verify newer primary was NOT converted (transaction rolled back)
    const unchangedNewerPrimary = await repository.findById(newerPrimary.id);
    expect(unchangedNewerPrimary).not.toBeNull();
    expect(unchangedNewerPrimary!.linkPrecedence).toBe('primary');
    expect(unchangedNewerPrimary!.linkedId).toBeNull();

    // Verify child still points to newer primary
    const unchangedChild = await repository.findById(child.id);
    expect(unchangedChild).not.toBeNull();
    expect(unchangedChild!.linkedId).toBe(newerPrimary.id);
  });
});
