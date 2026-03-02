import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { IdentityController } from './IdentityController';
import { IdentityService } from '../services/IdentityService';

describe('IdentityController - Error Handling', () => {
  let controller: IdentityController;
  let mockService: IdentityService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock service
    mockService = {
      reconcileIdentity: vi.fn(),
    } as any;

    // Create mock request and response
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      body: {},
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    controller = new IdentityController(mockService);
  });

  it('should return 503 for database connection errors', async () => {
    mockRequest.body = { email: 'test@example.com' };
    
    const connectionError = new Error("Can't reach database server");
    connectionError.name = 'PrismaClientInitializationError';
    vi.spyOn(mockService, 'reconcileIdentity').mockRejectedValue(connectionError);

    await controller.identify(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Database connection failed',
    });
  });

  it('should return 500 for transaction failures', async () => {
    mockRequest.body = { email: 'test@example.com' };
    
    const transactionError = new Error('Transaction failed');
    transactionError.name = 'PrismaClientKnownRequestError';
    vi.spyOn(mockService, 'reconcileIdentity').mockRejectedValue(transactionError);

    await controller.identify(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Failed to process identity reconciliation',
    });
  });

  it('should return 500 for generic errors', async () => {
    mockRequest.body = { email: 'test@example.com' };
    
    const genericError = new Error('Something went wrong');
    vi.spyOn(mockService, 'reconcileIdentity').mockRejectedValue(genericError);

    await controller.identify(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Internal server error',
    });
  });

  it('should return 400 for missing email and phoneNumber', async () => {
    mockRequest.body = {};

    await controller.identify(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Email or phoneNumber must be provided',
    });
  });

  it('should return 400 for invalid email data type', async () => {
    mockRequest.body = { email: 123 };

    await controller.identify(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Email must be a string',
    });
  });

  it('should return 400 for invalid phoneNumber data type', async () => {
    mockRequest.body = { phoneNumber: 123 };

    await controller.identify(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'PhoneNumber must be a string',
    });
  });
});
