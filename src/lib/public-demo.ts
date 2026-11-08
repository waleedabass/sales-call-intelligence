/** Deterministic sample workflows. No provider calls or shared visitor state. */
export function qualifyLead(x:{company:string;email:string;country:string;size:number;need:string}) {
  if(!x.company.trim()||!/^\S+@\S+\.\S+$/.test(x.email)||!x.need.trim()||!Number.isFinite(x.size)||x.size<1||x.size>1000000) throw Error('Enter a company, valid email, team size and workflow.');
  const country=x.country.trim().toLowerCase();
  const territory=/^(uae|united arab emirates|saudi arabia|qatar|kuwait|bahrain|oman)$/.test(country)?'GCC':/^(us|usa|united states)$/.test(country)?'United States':'Manual review';
  const reasons=[x.size>=10?'Team size fits the sample profile.':'Small team: check the scope before routing.',/automat|crm|support|invoice|lead|document/i.test(x.need)?'The requested workflow matches a service.':'Clarify the workflow with the prospect.',territory==='Manual review'?'Location needs human routing.':`Route to the ${territory} team.`];
  return {score:Math.min(100,30+(x.size>=10?25:10)+(/automat|crm|support|invoice|lead|document/i.test(x.need)?30:5)+(territory!=='Manual review'?15:0)),territory,reasons,followup:`Hi ${x.company.trim()} team,\n\nThanks for telling us about ${x.need.trim()}. Could you share the tools you use today and where the work gets stuck?\n\nPixel AI Solutions`};
}
export function extractInvoice(text:string) {
  if(!text.trim()||text.length>20000) throw Error('Paste invoice text between 1 and 20,000 characters.');
  const get=(r:RegExp)=>text.match(r)?.[1]?.trim()??'';
  const vendor=get(/(?:vendor|supplier)\s*:\s*(.+)/i);const invoice=get(/(?:invoice(?:\s*(?:number|no\.?))?)\s*[:#]\s*([^\n]+)/i);
  const currency=get(/currency\s*:\s*([A-Z]{3})/i).toUpperCase();
  const total=get(/(?:grand\s+total|total|amount\s+due)\s*:\s*(?:[A-Z]{3}\s*|[$£€]\s*)?([\d,]+(?:\.\d{1,2})?)/i).replaceAll(',','');
  const due=get(/due(?:\s+date)?\s*:\s*(\d{4}-\d{2}-\d{2})/i);
  const values={vendor,invoice,currency,total,due};const missing=Object.entries(values).filter(([,v])=>!v).map(([k])=>k);
  if(total&&(!Number.isFinite(Number(total))||Number(total)<=0))missing.push('positive total');
  if(due){const parsed=new Date(due+'T00:00:00Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==due)missing.push('valid due date');}
  return {...values,missing};
}
export function analyzeTranscript(text:string) {
  const transcript=text.trim();if(!transcript||transcript.length>20000)throw Error('Enter a transcript between 1 and 20,000 characters.');
  const lines=transcript.split(/\n|(?<=[.!?])\s+/).filter(Boolean);
  const risks=lines.flatMap(evidence=>[
    /security.*block|block.*security/i.test(evidence)?{name:'Security review',evidence}:null,
    /competitor|comparing|comparison/i.test(evidence)?{name:'Alternative vendor',evidence}:null
  ].filter((x):x is {name:string;evidence:string}=>Boolean(x)));
  const timing=/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d{4}-\d{2}-\d{2})\b/i;
  const uncertain=/maybe|possibly|might|depending|\bif\b|tentative/i;
  // Keep a qualified date in view before falling back to a generic action.
  // Otherwise an earlier "prepare a proposal" hides the buyer's conditions.
  const timedLines=lines.filter(line=>timing.test(line));
  const evidence=timedLines.find(line=>uncertain.test(line))??timedLines[0]??lines.find(line=>/next step|send|deliver|proposal|follow.up/i.test(line))??lines[0];
  const conditional=uncertain.test(evidence);
  const date=conditional?'Unconfirmed':(evidence.match(timing)?.[0]??'Unconfirmed');
  return {transcript,summary:lines.slice(0,2).join(' '),evidence,date,owner:'Unconfirmed',conditional,risks,followup:`Thanks for the conversation.\n\nProposed next step for review:\n${evidence}\n\nPlease confirm the owner and timing before we assign it.\n\nPixel AI Solutions`};
}
export function classifyReply(text:string) {
  if(!text.trim())return 'empty';
  if(/unsubscribe|remove me|stop contacting|opt.?out|no thanks|do not contact/i.test(text))return 'unsubscribe';
  if(/no budget|not interested|too expensive|not now|already use/i.test(text))return 'objection';
  if(/interested|book|demo|meeting|tell me more/i.test(text))return 'interested';return 'review';
}
export function supportReply(message:string,email:string):{answer:string;handoff:boolean} {
  if(!message.trim()||message.length>2000)throw Error('Enter a question between 1 and 2,000 characters.');
  if(/human|person|complaint|agent please/i.test(message))return {answer:'Sample handoff prepared. Your question and the chat history are attached below for the support team. No real ticket has been sent.',handoff:true};
  if(/order|tracking|1042/i.test(message)) {
    if(!email.trim())return {answer:'For the sample order, enter the matching customer email: jamie.rivera@example.com. Then ask about order 1042.',handoff:false};
    if(email.toLowerCase().trim()!=='jamie.rivera@example.com')return {answer:'I cannot verify those details. Check the sample email or ask for a human. No order information has been released.',handoff:false};
    if(!/1042/.test(message))return {answer:'Use fictional order 1042 to explore this sample lookup.',handoff:false};
    return {answer:'Sample order 1042 is in transit with Trail Express. Estimated delivery: 2 business days. Source: fictional order record 1042.',handoff:false};
  }
  if(/return|refund|exchange/i.test(message))return {answer:'Unused items with their original tags can be returned within 30 days. Worn footwear is excluded. Source: sample Returns Policy, section 1. For an exception, ask for a human.',handoff:false};
  if(/shipping|delivery|ship/i.test(message))return {answer:'Sample standard shipping takes 3–5 business days. Source: sample Shipping Policy, section 1.',handoff:false};
  return {answer:'That answer is not in the sample knowledge base. Ask about returns, shipping, or order 1042, or request a human handoff.',handoff:false};
}
export function reminderDraft(invoice:{id:string;customer:string;amount:number;disputed:boolean},tone:string) {
  if(invoice.disputed)throw Error('This invoice is disputed. Resolve the dispute before drafting another reminder.');
  if(!Number.isFinite(invoice.amount)||invoice.amount<=0)throw Error('No outstanding balance remains.');
  return `Subject: ${tone==='firm'?'Payment follow-up':'A quick check-in'} — ${invoice.id}\n\nHi ${invoice.customer},\n\n${tone==='firm'?'Please confirm the payment date for':'A friendly reminder about'} invoice ${invoice.id}, with an outstanding sample balance of USD ${invoice.amount.toFixed(2)}. If anything needs clarification, please reply so the team can help.\n\nPixel AI Solutions`;
}
