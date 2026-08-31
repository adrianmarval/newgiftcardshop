import { describe, it, expect, vi } from 'vitest';
import { realtimeBus, publishToUser, publishToUsers, publishToRole } from './bus';

describe('realtimeBus', () => {
  it('publishToUser entrega el evento solo al usuario destino', () => {
    const target = vi.fn();
    const other = vi.fn();

    const unsubTarget = realtimeBus.subscribe({ userId: 'u1', role: 'BUYER' }, target);
    const unsubOther = realtimeBus.subscribe({ userId: 'u2', role: 'BUYER' }, other);

    publishToUser('u1', ['orders']);

    expect(target).toHaveBeenCalledOnce();
    expect(target).toHaveBeenCalledWith({ keys: ['orders'] });
    expect(other).not.toHaveBeenCalled();

    unsubTarget();
    unsubOther();
  });

  it('publishToUsers entrega a todos los usuarios indicados', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    const unsub1 = realtimeBus.subscribe({ userId: 'u1', role: 'BUYER' }, l1);
    const unsub2 = realtimeBus.subscribe({ userId: 'u2', role: 'SELLER' }, l2);

    publishToUsers(['u1', 'u2'], ['notifications']);

    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();

    unsub1();
    unsub2();
  });

  it('publishToRole entrega a todos los suscritos de ese rol sin importar el userId', () => {
    const buyer = vi.fn();
    const seller = vi.fn();

    const unsubBuyer = realtimeBus.subscribe({ userId: 'u1', role: 'BUYER' }, buyer);
    const unsubSeller = realtimeBus.subscribe({ userId: 'u2', role: 'SELLER' }, seller);

    publishToRole('BUYER', ['availability']);

    expect(buyer).toHaveBeenCalledWith({ keys: ['availability'] });
    expect(seller).not.toHaveBeenCalled();

    unsubBuyer();
    unsubSeller();
  });

  it('unsubscribe deja de recibir eventos (user y role)', () => {
    const listener = vi.fn();
    const unsub = realtimeBus.subscribe({ userId: 'u1', role: 'ADMIN' }, listener);

    publishToUser('u1', ['payments']);
    expect(listener).toHaveBeenCalledOnce();

    unsub();

    publishToUser('u1', ['payments']);
    publishToRole('ADMIN', ['payments']);
    expect(listener).toHaveBeenCalledOnce();
  });
});
