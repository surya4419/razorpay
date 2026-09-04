import Razorpay from 'razorpay';
import { config } from './env.js';

let instance = null;

export function getRazorpayClient() {
  if (!instance) {
    instance = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }
  return instance;
}

export const razorpay = getRazorpayClient();
