import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    const prismaMock: any = {
      $queryRaw: jest.fn().mockResolvedValue(1),
      ledgerEntry: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { findFirst: jest.fn().mockResolvedValue({ id: 'a1' }) },
      disbursement: { findFirst: jest.fn().mockResolvedValue({ id: 'd1' }) },
      client: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
      loan: { findFirst: jest.fn().mockResolvedValue({ id: 'l1' }) },
      payment: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
      rollbackRecord: { findFirst: jest.fn().mockResolvedValue({ id: 'rb1' }) },
      repaymentSchedule: { findFirst: jest.fn().mockResolvedValue({ id: 'rs1' }) },
    };
    const ledgerMock: any = { /* not used directly in checkAll */ };
    const auditMock: any = { /* not used directly in checkAll */ };
    service = new HealthService(prismaMock as any, ledgerMock as any, auditMock as any);
  });

  it('checkAll should return ok when all subsystems are healthy', async () => {
    const result = await service.checkAll();
    expect(result).toHaveProperty('database', 'connected');
    expect(result).toHaveProperty('ledgerService');
    expect(result.ledgerService.status).toBe('ok');
    expect(result).toHaveProperty('auditService');
    expect(result.auditService.lastAuditId).toBe('a1');
    expect(result.status).toBe('ok');
  });
});
