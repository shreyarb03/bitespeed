import { ContactRepository } from '../repositories/ContactRepository';
import { Contact, ConsolidatedContact } from '../types/contact';

export class IdentityService {
  private repository: ContactRepository;

  constructor(repository: ContactRepository) {
    this.repository = repository;
  }

  /**
   * Find all contacts matching the provided email or phone number
   */
  private async findMatchingContacts(
    email: string | null,
    phoneNumber: string | null
  ): Promise<Contact[]> {
    return await this.repository.findByEmailOrPhoneNumber(email, phoneNumber);
  }

  /**
   * Determine the primary contact from a list of matched contacts
   * Returns the oldest primary contact, or fetches the primary if all matches are secondary
   */
  private async determinePrimaryContact(matches: Contact[]): Promise<Contact | null> {
    if (matches.length === 0) {
      return null;
    }

    // Find all primary contacts and sort by createdAt (oldest first)
    const primaries = matches
      .filter(c => c.linkPrecedence === 'primary')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (primaries.length > 0) {
      return primaries[0]; // Return oldest primary
    }

    // If all matches are secondary, fetch their primary contact
    const linkedId = matches[0].linkedId;
    if (linkedId === null) {
      throw new Error('Secondary contact has null linkedId');
    }

    const primary = await this.repository.findById(linkedId);
    if (!primary) {
      throw new Error(`Primary contact with id ${linkedId} not found`);
    }

    return primary;
  }

  /**
   * Create a new primary contact
   */
  private async createNewContact(
    email: string | null,
    phoneNumber: string | null,
    linkedId: number | null,
    linkPrecedence: 'primary' | 'secondary'
  ): Promise<Contact> {
    return await this.repository.create({
      email,
      phoneNumber,
      linkedId,
      linkPrecedence,
    });
  }

  /**
   * Check if the provided email is new (not present in any of the matched contacts)
   */
  private isEmailNew(email: string | null, matches: Contact[]): boolean {
    if (!email) {
      return false;
    }
    return !matches.some(contact => contact.email === email);
  }

  /**
   * Check if the provided phone number is new (not present in any of the matched contacts)
   */
  private isPhoneNumberNew(phoneNumber: string | null, matches: Contact[]): boolean {
    if (!phoneNumber) {
      return false;
    }
    return !matches.some(contact => contact.phoneNumber === phoneNumber);
  }

  /**
   * Determine if we need to create a secondary contact based on new information
   */
  private shouldCreateSecondaryContact(
    email: string | null,
    phoneNumber: string | null,
    matches: Contact[]
  ): boolean {
    return this.isEmailNew(email, matches) || this.isPhoneNumberNew(phoneNumber, matches);
  }

  /**
   * Create a secondary contact linked to the primary contact
   * Handles the case where the matched contact is itself secondary
   */
  private async createSecondaryContact(
    email: string | null,
    phoneNumber: string | null,
    primaryContact: Contact
  ): Promise<Contact> {
    return await this.repository.create({
      email,
      phoneNumber,
      linkedId: primaryContact.id,
      linkPrecedence: 'secondary',
    });
  }

  /**
   * Detect if matches contain multiple distinct primary contacts
   * Returns an object with:
   * - hasMultiplePrimaries: boolean indicating if multiple primaries exist
   * - olderPrimary: the oldest primary contact (by createdAt)
   * - newerPrimary: the newer primary contact (by createdAt)
   */
  private detectMultiplePrimaryContacts(matches: Contact[]): {
    hasMultiplePrimaries: boolean;
    olderPrimary: Contact | null;
    newerPrimary: Contact | null;
  } {
    // Filter to get only primary contacts
    const primaries = matches.filter(c => c.linkPrecedence === 'primary');

    // If we have less than 2 primaries, no multiple primaries exist
    if (primaries.length < 2) {
      return {
        hasMultiplePrimaries: false,
        olderPrimary: null,
        newerPrimary: null,
      };
    }

    // Sort primaries by createdAt timestamp (oldest first)
    const sortedPrimaries = primaries.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    return {
      hasMultiplePrimaries: true,
      olderPrimary: sortedPrimaries[0],
      newerPrimary: sortedPrimaries[1],
    };
  }

  /**
   * Link two primary contacts by converting the newer one to secondary
   * and updating all its children to point to the older primary.
   * All operations are wrapped in a database transaction.
   * 
   * @param olderPrimary - The older primary contact (will remain primary)
   * @param newerPrimary - The newer primary contact (will be converted to secondary)
   */
  private async linkContacts(
    olderPrimary: Contact,
    newerPrimary: Contact
  ): Promise<void> {
    await this.repository.transaction(async (prisma) => {
      // Create a temporary repository instance for the transaction
      const txRepo = new ContactRepository(prisma);

      // Step 1: Convert newer primary to secondary
      await txRepo.update(newerPrimary.id, {
        linkedId: olderPrimary.id,
        linkPrecedence: 'secondary',
      });

      // Step 2: Find all secondary contacts of the newer primary
      const children = await txRepo.findAllLinked(newerPrimary.id);

      // Step 3: Update all children to point to the older primary
      if (children.length > 0) {
        const childIds = children.map(c => c.id);
        await txRepo.updateMany(childIds, {
          linkedId: olderPrimary.id,
        });
      }
    });
  }

  /**
   * Consolidate all contact information for a primary contact
   * Fetches the primary contact and all linked secondary contacts,
   * then aggregates all unique emails, phone numbers, and secondary IDs
   * 
   * @param primaryContact - The primary contact to consolidate
   * @returns ConsolidatedContact object with all aggregated information
   */
  private async consolidateContacts(
    primaryContact: Contact
  ): Promise<ConsolidatedContact> {
    // Fetch all secondary contacts linked to this primary
    const secondaryContacts = await this.repository.findAllLinked(primaryContact.id);

    // Combine primary and secondary contacts, with primary first
    const allContacts = [primaryContact, ...secondaryContacts];

    // Sort secondary contacts by createdAt for consistent ordering
    const sortedSecondaries = secondaryContacts.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Collect unique emails (excluding nulls)
    const emails: string[] = [];
    
    // Add primary contact's email first (if exists)
    if (primaryContact.email) {
      emails.push(primaryContact.email);
    }

    // Add secondary contacts' emails in order of createdAt
    for (const contact of sortedSecondaries) {
      if (contact.email && !emails.includes(contact.email)) {
        emails.push(contact.email);
      }
    }

    // Collect unique phone numbers (excluding nulls)
    const phoneNumbers: string[] = [];
    
    // Add primary contact's phone number first (if exists)
    if (primaryContact.phoneNumber) {
      phoneNumbers.push(primaryContact.phoneNumber);
    }

    // Add secondary contacts' phone numbers in order of createdAt
    for (const contact of sortedSecondaries) {
      if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
        phoneNumbers.push(contact.phoneNumber);
      }
    }

    // Collect all secondary contact IDs
    const secondaryContactIds = secondaryContacts.map(c => c.id);

    return {
      primaryContactId: primaryContact.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    };
  }

  /**
   * Main orchestration method for identity reconciliation
   * Handles all scenarios: new contacts, secondary creation, and primary merging
   * All operations are wrapped in a database transaction
   * 
   * @param email - Email address to reconcile (can be null)
   * @param phoneNumber - Phone number to reconcile (can be null)
   * @returns ConsolidatedContact with all linked identity information
   */
  async reconcileIdentity(
    email: string | null,
    phoneNumber: string | null
  ): Promise<ConsolidatedContact> {
    try {
      return await this.repository.transaction(async (prisma) => {
        // Create a temporary repository instance for the transaction
        const txRepo = new ContactRepository(prisma);
        
        // Step 1: Find all matching contacts
        const matches = await txRepo.findByEmailOrPhoneNumber(email, phoneNumber);

        // Step 2: If no matches, create new primary contact and return consolidation
        if (matches.length === 0) {
          const newPrimary = await txRepo.create({
            email,
            phoneNumber,
            linkedId: null,
            linkPrecedence: 'primary',
          });
          return await this.consolidateContacts(newPrimary);
        }

        // Step 3: Determine primary contact from matches
        let primaryContact = await this.determinePrimaryContactFromMatches(matches, txRepo);

        // Step 4: Check if multiple primaries exist and merge them
        const { hasMultiplePrimaries, olderPrimary, newerPrimary } = 
          this.detectMultiplePrimaryContacts(matches);

        if (hasMultiplePrimaries && olderPrimary && newerPrimary) {
          // Merge the primaries
          await this.linkContactsInTransaction(olderPrimary, newerPrimary, txRepo);
          // Use the older primary as the primary contact
          primaryContact = olderPrimary;
        }

        // Step 5: Check if new information exists (new email or phone)
        const hasNewInfo = this.shouldCreateSecondaryContact(email, phoneNumber, matches);

        // Step 6: If new information exists, create secondary contact
        if (hasNewInfo) {
          await txRepo.create({
            email,
            phoneNumber,
            linkedId: primaryContact.id,
            linkPrecedence: 'secondary',
          });
        }

        // Step 7: Return consolidated contact information
        return await this.consolidateContactsWithRepo(primaryContact, txRepo);
      });
    } catch (error) {
      console.error('[IdentityService] Error in reconcileIdentity:', error);
      throw error;
    }
  }

  /**
   * Helper method to determine primary contact using a specific repository instance
   */
  private async determinePrimaryContactFromMatches(
    matches: Contact[],
    repo: ContactRepository
  ): Promise<Contact> {
    if (matches.length === 0) {
      throw new Error('Cannot determine primary from empty matches');
    }

    // Find all primary contacts and sort by createdAt (oldest first)
    const primaries = matches
      .filter(c => c.linkPrecedence === 'primary')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (primaries.length > 0) {
      return primaries[0]; // Return oldest primary
    }

    // If all matches are secondary, fetch their primary contact
    const linkedId = matches[0].linkedId;
    if (linkedId === null) {
      throw new Error('Secondary contact has null linkedId');
    }

    const primary = await repo.findById(linkedId);
    if (!primary) {
      throw new Error(`Primary contact with id ${linkedId} not found`);
    }

    return primary;
  }

  /**
   * Helper method to link contacts using a specific repository instance
   */
  private async linkContactsInTransaction(
    olderPrimary: Contact,
    newerPrimary: Contact,
    repo: ContactRepository
  ): Promise<void> {
    // Step 1: Convert newer primary to secondary
    await repo.update(newerPrimary.id, {
      linkedId: olderPrimary.id,
      linkPrecedence: 'secondary',
    });

    // Step 2: Find all secondary contacts of the newer primary
    const children = await repo.findAllLinked(newerPrimary.id);

    // Step 3: Update all children to point to the older primary
    if (children.length > 0) {
      const childIds = children.map(c => c.id);
      await repo.updateMany(childIds, {
        linkedId: olderPrimary.id,
      });
    }
  }

  /**
   * Helper method to consolidate contacts using a specific repository instance
   */
  private async consolidateContactsWithRepo(
    primaryContact: Contact,
    repo: ContactRepository
  ): Promise<ConsolidatedContact> {
    // Fetch all secondary contacts linked to this primary
    const secondaryContacts = await repo.findAllLinked(primaryContact.id);

    // Sort secondary contacts by createdAt for consistent ordering
    const sortedSecondaries = secondaryContacts.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Collect unique emails (excluding nulls)
    const emails: string[] = [];
    
    // Add primary contact's email first (if exists)
    if (primaryContact.email) {
      emails.push(primaryContact.email);
    }

    // Add secondary contacts' emails in order of createdAt
    for (const contact of sortedSecondaries) {
      if (contact.email && !emails.includes(contact.email)) {
        emails.push(contact.email);
      }
    }

    // Collect unique phone numbers (excluding nulls)
    const phoneNumbers: string[] = [];
    
    // Add primary contact's phone number first (if exists)
    if (primaryContact.phoneNumber) {
      phoneNumbers.push(primaryContact.phoneNumber);
    }

    // Add secondary contacts' phone numbers in order of createdAt
    for (const contact of sortedSecondaries) {
      if (contact.phoneNumber && !phoneNumbers.includes(contact.phoneNumber)) {
        phoneNumbers.push(contact.phoneNumber);
      }
    }

    // Collect all secondary contact IDs
    const secondaryContactIds = secondaryContacts.map(c => c.id);

    return {
      primaryContactId: primaryContact.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    };
  }
}
