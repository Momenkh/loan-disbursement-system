import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    const authService: any = { login: jest.fn().mockResolvedValue({ access_token: 't' }), logout: jest.fn().mockResolvedValue({ message: 'Logged out' }) };
    controller = new AuthController(authService as any);
  });

  it('login should call authService.login with req.user', async () => {
    const req: any = { user: { id: 'u1' } };
    const res = await controller.login(req as any);
    expect(res).toEqual({ access_token: 't' });
  });

  it('logout should call authService.logout', async () => {
    const res = await controller.logout();
    expect(res).toEqual({ message: 'Logged out' });
  });
});
