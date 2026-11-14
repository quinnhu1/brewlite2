import { assertTransition } from './order-state.js';
describe('order state machine', () => {
  it('allows the fulfilment flow and rejects jumps/terminal transitions', () => {
    expect(() => assertTransition('pending', 'paid')).not.toThrow();
    expect(() => assertTransition('paid', 'preparing')).not.toThrow();
    expect(() => assertTransition('paid', 'cancelled')).not.toThrow();
    expect(() => assertTransition('payment_failed', 'paid')).toThrow();
    expect(() => assertTransition('preparing', 'ready')).not.toThrow();
    expect(() => assertTransition('ready', 'completed')).not.toThrow();
    expect(() => assertTransition('paid', 'completed')).toThrow();
    expect(() => assertTransition('completed', 'paid')).toThrow();
    expect(() => assertTransition('cancelled', 'paid')).toThrow();
  });
});
