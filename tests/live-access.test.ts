import test from 'node:test';
import assert from 'node:assert/strict';
import { hasLiveAccess } from '../src/lib/live-access-policy';
import { proxy, config } from '../src/proxy';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch as unstable_doesProxyMatch } from 'next/experimental/testing/server';

const token='sample-private-token-with-at-least-32-characters';
const configured={ENABLE_LIVE_DEMO:'true',DATABASE_URL:'file:unused-test.db',PIXEL_LIVE_ACCESS_TOKEN:token};
test('dynamic application URLs keep sample protection even when IDs resemble asset filenames',()=>{
  for(const url of ['/leads/anything.svg','/invoices/anything.png','/api/webhooks/calcom','/pixel-p.svg/private'])
    assert.equal(unstable_doesProxyMatch({config,nextConfig:{},url}),true,url);
  for(const url of ['/pixel-p.svg','/pixel-sora.woff2','/_next/static/chunks/page.js'])
    assert.equal(unstable_doesProxyMatch({config,nextConfig:{},url}),false,url);
});
test('live actions require explicit enablement, a database and the exact private token',()=>{
  assert.equal(hasLiveAccess(configured,token),true);
  assert.equal(hasLiveAccess({},token),false);
  assert.equal(hasLiveAccess({...configured,ENABLE_LIVE_DEMO:'false'},token),false);
  assert.equal(hasLiveAccess({...configured,DATABASE_URL:undefined},token),false);
  assert.equal(hasLiveAccess({...configured,PIXEL_LIVE_ACCESS_TOKEN:'short'},'short'),false);
  assert.equal(hasLiveAccess(configured,''),false);
  assert.equal(hasLiveAccess(configured,token.slice(1)),false);
  assert.equal(hasLiveAccess(configured,token.replace('sample','forged')),false);
});

test('public requests cannot bypass sample isolation with forged sample headers',()=>{
  const previous={ENABLE_LIVE_DEMO:process.env.ENABLE_LIVE_DEMO,DATABASE_URL:process.env.DATABASE_URL,PIXEL_LIVE_ACCESS_TOKEN:process.env.PIXEL_LIVE_ACCESS_TOKEN};
  Object.assign(process.env,configured);
  try {
    const headers={'x-pixel-sample':'0'};
    assert.equal(proxy(new NextRequest('https://demo.example/',{method:'POST',headers})).status,403);
    assert.equal(proxy(new NextRequest('https://demo.example/api/webhooks/calcom',{headers})).status,403);
    const response=proxy(new NextRequest('https://demo.example/invoices/private',{headers}));
    assert.equal(new URL(response.headers.get('x-middleware-rewrite')!).pathname,'/demo');
    assert.equal(response.headers.get('x-middleware-request-x-pixel-sample'),'1');
    const allowed=proxy(new NextRequest('https://demo.example/',{headers:{authorization:'Bearer '+token}}));
    assert.equal(allowed.headers.get('x-middleware-next'),'1');
  } finally {
    for(const [key,value] of Object.entries(previous)) {
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
});

