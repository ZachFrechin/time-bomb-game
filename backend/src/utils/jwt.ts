import jwt from 'jsonwebtoken';
import { config } from '../config';

export function signToken(payload: object): string {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
}