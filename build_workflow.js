// Writes workflow.json for n8n. The Code node embeds src/route.js so workflow and tests cannot drift.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/src/route.js', 'utf8').replace(/module\.exports.*\n/, '');
const code = `${src}\nreturn $input.all().map(i => ({ json: { ...i.json.body, ...routeLead(i.json.body) } }));`;
const wf = {
  name: 'Inbound lead router',
  nodes: [
    { id: 'wh', name: 'Lead webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0],
      parameters: { httpMethod: 'POST', path: 'lead-in', responseMode: 'onReceived' } },
    { id: 'code', name: 'Gate and score', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0],
      parameters: { jsCode: code } },
    { id: 'sw', name: 'Route', type: 'n8n-nodes-base.switch', typeVersion: 3, position: [480, 0],
      parameters: { rules: { values: ['crm', 'nurture', 'reject'].map(r => ({
        conditions: { options: { caseSensitive: true, typeValidation: 'strict' }, combinator: 'and',
          conditions: [{ leftValue: '={{ $json.route }}', rightValue: r, operator: { type: 'string', operation: 'equals' } }] },
        renameOutput: true, outputKey: r })) } } },
    { id: 'hs', name: 'Upsert HubSpot contact', type: 'n8n-nodes-base.hubspot', typeVersion: 2, position: [740, -120],
      parameters: { resource: 'contact', operation: 'upsert', email: '={{ $json.email }}',
        additionalFields: { firstName: '={{ $json.first_name }}', jobTitle: '={{ $json.title }}', companyName: '={{ $json.company }}' } } },
    { id: 'sl', name: 'Alert sales channel', type: 'n8n-nodes-base.slack', typeVersion: 2.2, position: [980, -120],
      parameters: { select: 'channel', channelId: { __rl: true, mode: 'name', value: '#new-leads' },
        text: '={{ $json.company }}: {{ $json.title }} scored {{ $json.score }} ({{ $json.reason }})' } },
    { id: 'nu', name: 'Nurture list', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [740, 0], parameters: {} },
    { id: 'rj', name: 'Log rejected', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [740, 120], parameters: {} },
  ],
  connections: {
    'Lead webhook': { main: [[{ node: 'Gate and score', type: 'main', index: 0 }]] },
    'Gate and score': { main: [[{ node: 'Route', type: 'main', index: 0 }]] },
    'Route': { main: [[{ node: 'Upsert HubSpot contact', type: 'main', index: 0 }], [{ node: 'Nurture list', type: 'main', index: 0 }], [{ node: 'Log rejected', type: 'main', index: 0 }]] },
    'Upsert HubSpot contact': { main: [[{ node: 'Alert sales channel', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1' },
};
fs.writeFileSync(__dirname + '/workflow.json', JSON.stringify(wf, null, 2) + '\n');
console.log('wrote workflow.json');
