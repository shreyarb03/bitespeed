// Type definitions for Contact entity

export interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateContactData {
  phoneNumber?: string | null;
  email?: string | null;
  linkedId?: number | null;
  linkPrecedence: 'primary' | 'secondary';
}

export interface UpdateContactData {
  phoneNumber?: string | null;
  email?: string | null;
  linkedId?: number | null;
  linkPrecedence?: 'primary' | 'secondary';
  updatedAt?: Date;
}

export interface ConsolidatedContact {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}
