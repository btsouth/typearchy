export class ClientError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ClientError';
    this.status = status;
  }
}
