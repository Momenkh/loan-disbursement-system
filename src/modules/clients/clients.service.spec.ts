import { ClientsService } from './clients.service';
import { NotFoundException } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';

describe('ClientsService', () => {
  let service: ClientsService;
    
  beforeEach(() => {
    service = new ClientsService({} as any);
  });

  it('create() should call prisma.client.create and return result', async () => {
    const dto: CreateClientDto = { name: 'Alice', email: 'a@example.com', phoneNumber: '+100' };
    const created = { id: 'c1', ...dto };
    const mockPrisma: any = { client: { create: jest.fn().mockResolvedValue(created) } };
    (service as any).prisma = mockPrisma;

    const res = await service.create(dto);
    expect(mockPrisma.client.create).toHaveBeenCalledWith({ data: dto });
    expect(res).toEqual(created);
  });

  it('findOne() should throw NotFoundException when missing', async () => {
    const mockPrisma: any = { client: { findUnique: jest.fn().mockResolvedValue(null) } };
    (service as any).prisma = mockPrisma;
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() should call prisma.client.update after findOne', async () => {
    const dto = { name: 'New Name' } as any;
    const mockPrisma: any = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1' }),
        update: jest.fn().mockResolvedValue({ id: 'c1', ...dto }),
      },
    };
    (service as any).prisma = mockPrisma;
    const res = await service.update('c1', dto);
    expect(mockPrisma.client.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: dto });
    expect(res).toEqual({ id: 'c1', ...dto });
  });

  it('updateKyc should call findOne then update kycStatus', async () => {
    const mockPrisma: any = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c2' }),
        update: jest.fn().mockResolvedValue({ id: 'c2', kycStatus: 'verified' }),
      },
    };
    (service as any).prisma = mockPrisma;
    const res = await service.updateKyc('c2', { kycStatus: 'verified' } as any);
    expect(mockPrisma.client.update).toHaveBeenCalledWith({ where: { id: 'c2' }, data: { kycStatus: 'verified' } });
    expect(res).toEqual({ id: 'c2', kycStatus: 'verified' });
  });

  it('remove should delete client after findOne', async () => {
    const mockPrisma: any = {
      client: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c3' }),
        delete: jest.fn().mockResolvedValue({ id: 'c3' }),
      },
    };
    (service as any).prisma = mockPrisma;
    const res = await service.remove('c3');
    expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: 'c3' } });
    expect(res).toEqual({ id: 'c3' });
  });
});
