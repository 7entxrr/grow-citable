import { Paddle, Environment } from '@paddle/paddle-node-sdk';

function getPaddle(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY;
  const environment = process.env.PADDLE_ENVIRONMENT;

  if (!apiKey) {
    throw new Error('PADDLE_API_KEY env var is required');
  }
  if (!environment || (environment !== 'sandbox' && environment !== 'production')) {
    throw new Error('PADDLE_ENVIRONMENT must be "sandbox" or "production"');
  }

  return new Paddle(apiKey, {
    environment:
      environment === 'sandbox' ? Environment.sandbox : Environment.production,
  });
}

let paddleInstance: Paddle | null = null;

export function getPaddleClient(): Paddle {
  if (!paddleInstance) {
    paddleInstance = getPaddle();
  }
  return paddleInstance;
}
