import { timingSafeEqual } from 'node:crypto';

export function hasLiveAccess(env:Readonly<Record<string,string|undefined>>,token:string):boolean {
  const expected=env.PIXEL_LIVE_ACCESS_TOKEN??'';
  if(env.ENABLE_LIVE_DEMO!=='true'||!env.DATABASE_URL||expected.length<32)return false;
  const a=Buffer.from(expected),b=Buffer.from(token);
  return a.length===b.length&&timingSafeEqual(a,b);
}

