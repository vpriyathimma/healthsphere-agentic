#!/usr/bin/env bash
# Snapshot each agent's credential policy into the committed store so ACTIVATE
# always has a restore source, even after a Render deploy resets the filesystem.
# Run once from the repo root, then commit reva-backend/data/credential-policies.json
set -euo pipefail
REGION="${REGION:-us-west-2}"
BASE="${BASE:-https://healthsphere-agentic.onrender.com}"
OUT="reva-backend/data/credential-policies.json"
mkdir -p "$(dirname "$OUT")"

curl -s "$BASE/api/discovery" \
| python3 -c "
import sys, json, subprocess, datetime
d = json.load(sys.stdin)
store = {'policies': {}, 'events': []}
for a in d.get('agentcoreAgents', []) + d.get('bedrockAgents', []):
    arn = a.get('roleArn')
    if not arn: continue
    aid = a.get('agentRuntimeId') or a.get('agentId')
    role = arn.split('/')[-1]
    names = json.loads(subprocess.check_output(
        ['aws','iam','list-role-policies','--role-name',role,'--output','json']))['PolicyNames']
    for n in names:
        doc = json.loads(subprocess.check_output(
            ['aws','iam','get-role-policy','--role-name',role,'--policy-name',n,'--output','json']))['PolicyDocument']
        acts = [x for st in doc.get('Statement',[])
                  for x in (st['Action'] if isinstance(st.get('Action'),list) else [st.get('Action')])]
        if any(x in ('bedrock-agentcore:GetResourceOauth2Token','bedrock-agentcore:*','*') for x in acts if x):
            store['policies'][aid] = {'agentName': a.get('name'), 'roleName': role,
                'policyName': n, 'document': doc,
                'savedAt': datetime.datetime.utcnow().isoformat()+'Z'}
            print('captured', a.get('name'), '->', role + '/' + n, file=sys.stderr)
            break
json.dump(store, open('$OUT','w'), indent=2)
print('wrote $OUT with', len(store['policies']), 'policies', file=sys.stderr)
"
