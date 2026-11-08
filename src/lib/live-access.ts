import { headers, cookies } from 'next/headers';
import { hasLiveAccess } from './live-access-policy';

export async function requireLiveAccess():Promise<void> {
  const requestHeaders=await headers();
  const token=(await cookies()).get('pixel-live-access')?.value
    ??requestHeaders.get('authorization')?.replace(/^Bearer /,'')??'';
  if(!hasLiveAccess(process.env,token))throw new Error('This public sample cannot perform live integration actions.');
}

