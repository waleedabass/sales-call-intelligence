import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifyLead, extractInvoice, analyzeTranscript, classifyReply, supportReply, reminderDraft } from '../src/lib/public-demo.ts';
test('qualification routes GCC explicitly and does not invent a territory',()=>{
  assert.equal(qualifyLead({company:'Demo agency',email:'sam@example.com',country:'UAE',size:50,need:'CRM automation'}).territory,'GCC');
  assert.equal(qualifyLead({company:'Demo agency',email:'sam@example.com',country:'Unknown',size:50,need:'CRM automation'}).territory,'Manual review');
  assert.throws(()=>qualifyLead({company:'',email:'bad',country:'US',size:50,need:'CRM'}));
});
test('invoice extraction uses submitted values and flags missing fields',()=>{
  const a=extractInvoice('Vendor: Pixel Sample Ltd\nInvoice: INV-42\nCurrency: USD\nTotal: 420.50\nDue: 2026-12-01');
  assert.equal(a.total,'420.50');assert.equal(a.vendor,'Pixel Sample Ltd');assert.equal(a.missing.length,0);
  assert.ok(extractInvoice('Vendor: Sample').missing.includes('total'));
});
test('conditional dates stay unconfirmed and evidence comes from the call',()=>{
  const a=analyzeTranscript('Buyer: Maybe Friday, if the client approves.');
  assert.equal(a.date,'Unconfirmed');assert.ok(a.evidence.includes('Maybe Friday'));
  assert.equal(analyzeTranscript('Rep: Thank you for joining.').risks.length,0);
  assert.throws(()=>analyzeTranscript('   '));
});

test('conditional timing takes priority over an earlier proposal in a full call',()=>{
  const transcript='Buyer: We want to connect our CRM and onboarding.\nRep: I can prepare a proposal.\nBuyer: Maybe Friday, if our client approves. Security review is a blocker.\nRep: I will send the security checklist for review.';
  const result=analyzeTranscript(transcript);
  assert.equal(result.evidence,'Buyer: Maybe Friday, if our client approves.');
  assert.equal(result.conditional,true);
  assert.equal(result.date,'Unconfirmed');
  assert.match(result.followup,/Maybe Friday, if our client approves/);
});

test('weekend and ISO timing are preserved ahead of a generic action',()=>{
  for(const date of ['Saturday','Sunday','2026-12-01']) {
    const result=analyzeTranscript(`Rep: I will send a proposal.\nBuyer: The next review is ${date}.`);
    assert.equal(result.date,date);
    assert.match(result.evidence,new RegExp(date));
  }
});
test('opt-out takes priority over apparent interest',()=>{
  assert.equal(classifyReply('Thanks, but please unsubscribe me'),'unsubscribe');
  assert.equal(classifyReply('Interested, can we book a demo?'),'interested');
  assert.equal(classifyReply('We have no budget'),'objection');
});
test('support order lookup requires the matching sample identity',()=>{
  assert.match(supportReply('Where is order 1042?','').answer,/email/i);
  assert.match(supportReply('Order 1042','wrong@example.com').answer,/verify/i);
  assert.match(supportReply('Order 1042','jamie.rivera@example.com').answer,/in transit/i);
  assert.equal(supportReply('Please get a human','').handoff,true);
});
test('disputed or paid invoices cannot generate collection drafts',()=>{
  assert.throws(()=>reminderDraft({id:'INV-1',customer:'Sample',amount:100,disputed:true},'friendly'),/dispute/i);
  assert.throws(()=>reminderDraft({id:'INV-1',customer:'Sample',amount:0,disputed:false},'friendly'),/balance/i);
  assert.match(reminderDraft({id:'INV-1',customer:'Sample',amount:100,disputed:false},'friendly'),/INV-1/);
});
