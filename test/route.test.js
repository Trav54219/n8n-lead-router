const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { routeLead } = require('../src/route');
const leads = require('../sample_data/leads.json');

test('gates reject with a reason', () => {
  assert.strictEqual(routeLead(leads[1]).reason, 'free_mail');
  assert.strictEqual(routeLead(leads[2]).reason, 'role_inbox');
  assert.strictEqual(routeLead(leads[4]).reason, 'invalid_email');
});
test('strong fit goes to the CRM, weak fit to nurture', () => {
  assert.strictEqual(routeLead(leads[0]).route, 'crm');
  assert.strictEqual(routeLead(leads[5]).route, 'crm');
  assert.strictEqual(routeLead(leads[3]).route, 'nurture');
});
test('score is explained, never a bare number', () => {
  assert.match(routeLead(leads[0]).reason, /persona_title \+40/);
});
test('workflow.json embeds the current route.js and wires every node', () => {
  const wf = JSON.parse(fs.readFileSync(__dirname + '/../workflow.json', 'utf8'));
  const code = wf.nodes.find(n => n.name === 'Gate and score').parameters.jsCode;
  assert.ok(code.includes('function routeLead'));
  const names = new Set(wf.nodes.map(n => n.name));
  for (const [from, c] of Object.entries(wf.connections)) {
    assert.ok(names.has(from));
    c.main.flat().forEach(t => assert.ok(names.has(t.node), t.node));
  }
});
test('the embedded Code-node body runs the same as the module', () => {
  const wf = JSON.parse(fs.readFileSync(__dirname + '/../workflow.json', 'utf8'));
  const code = wf.nodes.find(n => n.name === 'Gate and score').parameters.jsCode;
  const run = new Function('$input', code);
  const out = run({ all: () => leads.map(body => ({ json: { body } })) });
  assert.deepStrictEqual(out.map(o => o.json.route), leads.map(l => routeLead(l).route));
});
