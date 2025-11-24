import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

describe('AuditInterceptor', () => {
  it('exists as a class (interceptor is currently a stub)', () => {
    const interceptor = new AuditInterceptor();
    expect(interceptor).toBeDefined();
  });
});
