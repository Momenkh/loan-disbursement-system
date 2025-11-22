import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    // provide mocks for JwtService and PrismaService
    const jwtMock: any = { sign: jest.fn().mockReturnValue('token') };
    const prismaMock: any = { user: { findUniqueOrThrow: jest.fn() } };
    service = new AuthService(jwtMock as any, prismaMock as any);
  });

  it('validateUser should throw when user not found or password mismatch', async () => {
    const prisma: any = (service as any).prisma;
    prisma.user.findUniqueOrThrow.mockRejectedValue(new UnauthorizedException());
    await expect(service.validateUser('u','p')).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', username: 'u', password: 'hash', role: 'admin' });
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(false);
    await expect(service.validateUser('u','wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validateUser should return user shape when password matches', async () => {
    const prisma: any = (service as any).prisma;
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', username: 'u', password: 'hash', role: 'admin' });
    (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
    const out = await service.validateUser('u','p');
    expect(out).toEqual({ id: 'u1', username: 'u', role: 'admin' });
  });

  it('login should return access_token', async () => {
    const jwt: any = (service as any).jwtService;
    const res = await service.login({ id: 'u1' });
    expect(jwt.sign).toHaveBeenCalled();
    expect(res).toEqual({ access_token: 'token' });
  });
});
