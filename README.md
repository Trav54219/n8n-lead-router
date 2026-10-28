# n8n lead router

An importable n8n workflow that takes an inbound lead from a webhook, gates and scores it, and routes
it: strong fits are upserted into HubSpot and announced in Slack, weak fits go to a nurture list, and
bad addresses are logged with a reason.

```
Lead webhook -> Gate and score -> Route -+-> crm      -> Upsert HubSpot contact -> Alert sales channel
                                         +-> nurture  -> Nurture list
                                         +-> reject   -> Log rejected
```

## Use it

1. In n8n: Workflows > Import from file > `workflow.json`.
2. Attach your own HubSpot and Slack credentials to those two nodes.
3. POST a lead to the webhook:
   `{"email":"ana.cole@loop.example","first_name":"Ana","title":"Head of Growth","company":"Loop","employees":45,"description":"outbound for a saas product"}`

## The scoring

Gates reject invalid email, free mail, and role inboxes (`info@`, `sales@`). Passing leads score
0 to 100: 10 for a company-domain email, 40 for a growth/revenue/sales leadership title or founder,
25 for 20 to 500 employees, up to 25 for keywords in the description. 60 or more goes to the CRM.
Every result carries its reasons, for example `company_domain +10, persona_title +40`.

## One source of truth

The logic lives in `src/route.js`. `build_workflow.js` embeds that file in the workflow's Code node,
so the workflow and the tests cannot drift. Edit `src/route.js`, then `npm run build`.

## Tests

```
npm test
```

Five tests: the gates, the routing, the explained score, that `workflow.json` wires every node, and
that the Code-node body embedded in `workflow.json` returns the same routes as the module.

## Limits

- I have not imported this into a running n8n instance or sent anything to HubSpot or Slack. The
  tests cover the logic and the workflow file's structure, not n8n's execution. Node parameter names
  follow n8n's current node versions and may need small edits on import.
- The 6 sample leads are made up, with `.example` domains.
- Keyword and title matching is a filter, not understanding. It does not verify the mailbox exists.
