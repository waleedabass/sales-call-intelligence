import { NextResponse, type NextRequest } from 'next/server';
import { hasLiveAccess } from './lib/live-access-policy';
function privateAccess(request:NextRequest){
  const token=request.cookies.get('pixel-live-access')?.value??request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
  return hasLiveAccess(process.env,token);
}
export function proxy(request:NextRequest){
  const path=request.nextUrl.pathname;
  const internal=privateAccess(request)&&path!=='/demo';
  const headers=new Headers(request.headers);headers.set('x-pixel-sample',internal?'0':'1');
  if(internal)return NextResponse.next({request:{headers}});
  if(!['GET','HEAD'].includes(request.method)||path.startsWith('/api/'))return NextResponse.json({error:'This public sample cannot perform live integration actions.'},{status:403});
  if(path==='/demo')return NextResponse.next({request:{headers}});
  const url=request.nextUrl.clone();url.pathname='/demo';url.search='';
  return NextResponse.rewrite(url,{request:{headers}});
}
export const config={matcher:['/((?!_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$|icon\\.svg$|pixel-p\\.svg$|pixel-sora\\.woff2$).*)']};
