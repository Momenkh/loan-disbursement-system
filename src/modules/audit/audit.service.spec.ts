import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService({} as any);
  });

  it('logTransaction should create an audit log when transactionId and metadata present', async () => {
    const prismaMock: any = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'a1' }) } };
    (service as any).prisma = prismaMock;
    const res = await service.logTransaction('tx1', 'op', 'u1', { foo: 'bar' });
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
    expect(res).toEqual({ id: 'a1' });
  });

  it('logTransaction should return null when metadata missing', async () => {
    const res = await service.logTransaction('tx1', 'op', 'u1', undefined as any);
    expect(res).toBeNull();
  });
});
