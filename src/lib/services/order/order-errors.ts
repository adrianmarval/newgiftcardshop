export class OrderNotFoundError extends Error {
  constructor(message = 'Orden no encontrada') {
    super(message);
    this.name = 'OrderNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'No autorizado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class InvalidOrderStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderStateError';
  }
}

export class OrderAlreadyProcessedError extends Error {
  constructor(message = 'La orden ya fue procesada') {
    super(message);
    this.name = 'OrderAlreadyProcessedError';
  }
}

export class PaymentVerificationError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PaymentVerificationError';
    this.code = code;
  }
}
