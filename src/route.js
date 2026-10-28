// Gate and score one inbound lead. Pure function so n8n's Code node and the tests run the same code.
const FREE = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com'];
const ROLE = ['info', 'sales', 'support', 'admin', 'contact', 'hello', 'office'];
const PERSONA = /(head|vp|director|manager|lead).*(growth|revenue|gtm|marketing|sales|operations)|founder|ceo|cro/i;

function routeLead(lead) {
  const email = String(lead.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) return { route: 'reject', reason: 'invalid_email', score: 0 };
  const [local, domain] = email.split('@');
  if (FREE.includes(domain)) return { route: 'reject', reason: 'free_mail', score: 0 };
  if (ROLE.includes(local)) return { route: 'reject', reason: 'role_inbox', score: 0 };
  let score = 10; // email on a company domain
  const reasons = ['company_domain +10'];
  if (PERSONA.test(lead.title || '')) { score += 40; reasons.push('persona_title +40'); }
  const n = Number(lead.employees);
  if (n >= 20 && n <= 500) { score += 25; reasons.push('headcount_in_band +25'); }
  const hits = ['outbound', 'pipeline', 'revops', 'saas', 'sales team'].filter(k =>
    String(lead.description || '').toLowerCase().includes(k)).length;
  if (hits) { const pts = Math.min(hits, 2) * 12.5; score += pts; reasons.push(`keywords(${hits}) +${pts}`); }
  score = Math.round(score);
  return { route: score >= 60 ? 'crm' : 'nurture', reason: reasons.join(', '), score };
}
module.exports = { routeLead };
