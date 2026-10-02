import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Room service unavailable. Please try again shortly.');return env.DB;}
