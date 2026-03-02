import { PrismaClient } from '@prisma/client';
import { Contact, CreateContactData, UpdateContactData } from '../types/contact';

export class ContactRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Find all contacts with the given email address
   */
  async findByEmail(email: string): Promise<Contact[]> {
    try {
      const contacts = await this.prisma.contact.findMany({
        where: { email },
      });
      return contacts as Contact[];
    } catch (error) {
      console.error('[ContactRepository] Error in findByEmail:', error);
      throw error;
    }
  }

  /**
   * Find all contacts with the given phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<Contact[]> {
    try {
      const contacts = await this.prisma.contact.findMany({
        where: { phoneNumber },
      });
      return contacts as Contact[];
    } catch (error) {
      console.error('[ContactRepository] Error in findByPhoneNumber:', error);
      throw error;
    }
  }

  /**
   * Find all contacts matching either email OR phoneNumber
   */
  async findByEmailOrPhoneNumber(
    email: string | null,
    phoneNumber: string | null
  ): Promise<Contact[]> {
    try {
      const whereConditions = [];
      
      if (email) {
        whereConditions.push({ email });
      }
      
      if (phoneNumber) {
        whereConditions.push({ phoneNumber });
      }

      if (whereConditions.length === 0) {
        return [];
      }

      const contacts = await this.prisma.contact.findMany({
        where: {
          OR: whereConditions,
        },
      });
      
      return contacts as Contact[];
    } catch (error) {
      console.error('[ContactRepository] Error in findByEmailOrPhoneNumber:', error);
      throw error;
    }
  }

  /**
   * Find a contact by its ID
   */
  async findById(id: number): Promise<Contact | null> {
    try {
      const contact = await this.prisma.contact.findUnique({
        where: { id },
      });
      return contact as Contact | null;
    } catch (error) {
      console.error('[ContactRepository] Error in findById:', error);
      throw error;
    }
  }

  /**
   * Find all secondary contacts linked to a primary contact
   */
  async findAllLinked(primaryId: number): Promise<Contact[]> {
    try {
      const contacts = await this.prisma.contact.findMany({
        where: {
          linkedId: primaryId,
          linkPrecedence: 'secondary',
        },
      });
      return contacts as Contact[];
    } catch (error) {
      console.error('[ContactRepository] Error in findAllLinked:', error);
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  async create(data: CreateContactData): Promise<Contact> {
    try {
      const contact = await this.prisma.contact.create({
        data: {
          email: data.email ?? null,
          phoneNumber: data.phoneNumber ?? null,
          linkedId: data.linkedId ?? null,
          linkPrecedence: data.linkPrecedence,
        },
      });
      return contact as Contact;
    } catch (error) {
      console.error('[ContactRepository] Error in create:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  async update(id: number, data: UpdateContactData): Promise<Contact> {
    try {
      const contact = await this.prisma.contact.update({
        where: { id },
        data: {
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
          ...(data.linkedId !== undefined && { linkedId: data.linkedId }),
          ...(data.linkPrecedence !== undefined && { linkPrecedence: data.linkPrecedence }),
        },
      });
      return contact as Contact;
    } catch (error) {
      console.error('[ContactRepository] Error in update:', error);
      throw error;
    }
  }

  /**
   * Update multiple contacts at once
   */
  async updateMany(ids: number[], data: UpdateContactData): Promise<void> {
    try {
      await this.prisma.contact.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          ...(data.linkedId !== undefined && { linkedId: data.linkedId }),
          ...(data.linkPrecedence !== undefined && { linkPrecedence: data.linkPrecedence }),
        },
      });
    } catch (error) {
      console.error('[ContactRepository] Error in updateMany:', error);
      throw error;
    }
  }

  /**
   * Execute a function within a database transaction
   * Automatically rolls back on any error
   */
  async transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return await fn(tx as PrismaClient);
      });
    } catch (error) {
      // Log transaction error - Prisma automatically rolls back on error
      console.error('[ContactRepository] Transaction failed and rolled back:', error);
      throw error;
    }
  }
}
