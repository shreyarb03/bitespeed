import { Request, Response } from 'express';
import { IdentityService } from '../services/IdentityService';

export class IdentityController {
  private identityService: IdentityService;

  constructor(identityService: IdentityService) {
    this.identityService = identityService;
  }

  /**
   * POST /identify endpoint handler
   * Validates request body and calls IdentityService to reconcile identity
   * Returns consolidated contact information or error response
   */
  async identify(req: Request, res: Response): Promise<void> {
    try {
      // Extract email and phoneNumber from request body
      const { email, phoneNumber } = req.body;

      // Validate that at least one of email or phoneNumber is provided
      if (!email && !phoneNumber) {
        res.status(400).json({
          error: 'Email or phoneNumber must be provided'
        });
        return;
      }

      // Validate data types if provided
      if (email !== undefined && email !== null && typeof email !== 'string') {
        res.status(400).json({
          error: 'Email must be a string'
        });
        return;
      }

      if (phoneNumber !== undefined && phoneNumber !== null && typeof phoneNumber !== 'string') {
        res.status(400).json({
          error: 'PhoneNumber must be a string'
        });
        return;
      }

      // Call IdentityService to reconcile identity
      const consolidatedContact = await this.identityService.reconcileIdentity(
        email || null,
        phoneNumber || null
      );

      // Format and return response according to API specification
      res.status(200).json({
        contact: {
          primaryContactId: consolidatedContact.primaryContactId,
          emails: consolidatedContact.emails,
          phoneNumbers: consolidatedContact.phoneNumbers,
          secondaryContactIds: consolidatedContact.secondaryContactIds
        }
      });
    } catch (error) {
      // Log all errors with appropriate detail
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [IdentityController] Error in identify endpoint`);
      
      if (error instanceof Error) {
        console.error(`[${timestamp}] Error type: ${error.name}`);
        console.error(`[${timestamp}] Error message: ${error.message}`);
        console.error(`[${timestamp}] Stack trace:`, error.stack);
        
        // Check if it's a Prisma connection error
        if (
          error.message.includes('Can\'t reach database server') ||
          error.message.includes('Connection') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('timeout') ||
          error.name === 'PrismaClientInitializationError' ||
          error.name === 'PrismaClientKnownRequestError' && error.message.includes('connection')
        ) {
          console.error(`[${timestamp}] Database connection error detected`);
          res.status(503).json({
            error: 'Database connection failed'
          });
          return;
        }

        // Check if it's a transaction or database operation error
        if (
          error.message.includes('transaction') ||
          error.message.includes('database') ||
          error.name === 'PrismaClientKnownRequestError' ||
          error.name === 'PrismaClientUnknownRequestError' ||
          error.name === 'PrismaClientRustPanicError'
        ) {
          console.error(`[${timestamp}] Database transaction/operation error detected`);
          res.status(500).json({
            error: 'Failed to process identity reconciliation'
          });
          return;
        }

        // Generic server error
        console.error(`[${timestamp}] Generic server error`);
        res.status(500).json({
          error: 'Internal server error'
        });
      } else {
        // Unknown error type
        console.error(`[${timestamp}] Unknown error type:`, error);
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  }
}
