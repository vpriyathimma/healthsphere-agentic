/**
 * Reva AWS Discovery Connector
 *
 * Discovers: AgentCore agents, Bedrock Agents (all regions), gateways, targets,
 * workload identities, OAuth providers, Cognito users, Lambda functions, IAM roles (NHIs),
 * and IAM users with their long-lived access-key posture.
 *
 * Enrichment (enrichment.js) additionally attaches resource tags, the OBSERVED
 * model from CloudTrail inference telemetry, and model/residency drift.
 *
 * IAM roles filtered by trust policy service principal — not by name.
 * NHI = IAM Roles + Workload Identities + OAuth Credential Providers.
 *
 * Validated against official AWS API docs:
 *   GetAgentRuntime: https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/API_GetAgentRuntime.html
 *   GetAgent: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_GetAgent.html
 *   GetGateway/GetGatewayTarget: https://docs.aws.amazon.com/bedrock-agentcore-control/latest/APIReference/
 *   GetRole/ListAttachedRolePolicies/ListRolePolicies/GetRolePolicy: https://docs.aws.amazon.com/IAM/latest/APIReference/
 *   DescribeRegions: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DescribeRegions.html
 */

const {
  BedrockAgentCoreControlClient,
  ListAgentRuntimesCommand, GetAgentRuntimeCommand,
  ListGatewaysCommand, GetGatewayCommand,
  ListGatewayTargetsCommand, GetGatewayTargetCommand,
  ListWorkloadIdentitiesCommand,
  ListOauth2CredentialProvidersCommand, GetOauth2CredentialProviderCommand,
} = require("@aws-sdk/client-bedrock-agentcore-control");

const {
  BedrockAgentClient, ListAgentsCommand, GetAgentCommand,
} = require("@aws-sdk/client-bedrock-agent");

const {
  CognitoIdentityProviderClient,
  ListUserPoolsCommand, ListUsersCommand, ListGroupsCommand, ListUsersInGroupCommand,
  ListUserPoolClientsCommand, DescribeUserPoolClientCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const { LambdaClient, ListFunctionsCommand } = require("@aws-sdk/client-lambda");

const {
  IAMClient, ListRolesCommand, GetRoleCommand,
  ListAttachedRolePoliciesCommand, ListRolePoliciesCommand, GetRolePolicyCommand,
  ListUsersCommand: ListIamUsersCommand, GetUserCommand,
  ListAccessKeysCommand, GetAccessKeyLastUsedCommand,
  ListMFADevicesCommand, ListGroupsForUserCommand,
  ListAttachedUserPoliciesCommand, ListUserPoliciesCommand,
} = require("@aws-sdk/client-iam");

const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
const { EC2Client, DescribeRegionsCommand } = require("@aws-sdk/client-ec2");

const {
  SecretsManagerClient, DescribeSecretCommand,
} = require("@aws-sdk/client-secrets-manager");

const { enrichDiscovery } = require("./enrichment");

// Service principals for trust policy filtering
const NHI_SERVICE_PRINCIPALS = [
  "bedrock-agentcore.amazonaws.com",
  "bedrock.amazonaws.com",
  "lambda.amazonaws.com",
];

function extractServicePrincipals(trustPolicy) {
  if (!trustPolicy || !trustPolicy.Statement) return [];
  var principals = [];
  for (var stmt of trustPolicy.Statement) {
    var p = stmt.Principal;
    if (!p) continue;
    var svc = p.Service;
    if (!svc) continue;
    if (Array.isArray(svc)) principals.push.apply(principals, svc);
    else principals.push(svc);
  }
  return principals;
}

function parseTrustPolicy(doc) {
  if (!doc) return null;
  try { return JSON.parse(decodeURIComponent(doc)); } catch (_) {
    try { return JSON.parse(doc); } catch (__) { return null; }
  }
}

async function runDiscovery({ region, accessKeyId, secretAccessKey }) {
  var credentials = { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey };
  var clientConfig = { region: region, credentials: credentials };

  var agentcoreClient = new BedrockAgentCoreControlClient(clientConfig);
  var cognitoClient = new CognitoIdentityProviderClient(clientConfig);
  var lambdaClient = new LambdaClient(clientConfig);
  var iamClient = new IAMClient(clientConfig);
  var stsClient = new STSClient(clientConfig);
  var ec2Client = new EC2Client(clientConfig);

  var results = {
    account: null,
    agentcoreAgents: [],
    bedrockAgents: [],
    gateways: [],
    gatewayTargets: [],
    workloadIdentities: [],
    oauthProviders: [],
    appClients: [],
    users: [],
    groups: [],
    lambdaFunctions: [],
    iamRoles: [],
    iamUsers: [],
    nhis: [],
    cognitoPools: [],
    discoveredAt: new Date().toISOString(),
    errors: [],
  };

  // ── 1. Caller identity ──
  try {
    var identity = await stsClient.send(new GetCallerIdentityCommand({}));
    results.account = { accountId: identity.Account, arn: identity.Arn, userId: identity.UserId };
  } catch (err) { results.errors.push({ step: "sts:GetCallerIdentity", error: err.message }); }

  // ── 2. AgentCore Runtime agents ──
  try {
    var nextToken;
    do {
      var res = await agentcoreClient.send(new ListAgentRuntimesCommand({ maxResults: 50, nextToken: nextToken }));
      for (var rt of (res.agentRuntimes || [])) {
        var d = {};
        try { d = await agentcoreClient.send(new GetAgentRuntimeCommand({ agentRuntimeId: rt.agentRuntimeId })); } catch (e) { results.errors.push({ step: "agentcore:GetAgentRuntime(" + rt.agentRuntimeId + ")", error: e.message }); }
        results.agentcoreAgents.push({
          agentType: "AgentCore Runtime",
          agentRuntimeArn: d.agentRuntimeArn || rt.agentRuntimeArn,
          agentRuntimeId: d.agentRuntimeId || rt.agentRuntimeId,
          name: d.agentRuntimeName || rt.agentRuntimeName,
          agentRuntimeVersion: d.agentRuntimeVersion || rt.agentRuntimeVersion,
          description: d.description || rt.description || "",
          status: d.status || rt.status,
          region: region,
          createdAt: d.createdAt || null,
          lastUpdatedAt: d.lastUpdatedAt || rt.lastUpdatedAt,
          roleArn: d.roleArn || null,
          environmentVariables: d.environmentVariables || null,
          workloadIdentityDetails: d.workloadIdentityDetails || null,
          authorizerConfiguration: d.authorizerConfiguration || null,
          networkConfiguration: d.networkConfiguration || null,
          protocolConfiguration: d.protocolConfiguration || null,
          lifecycleConfiguration: d.lifecycleConfiguration || null,
          agentRuntimeArtifact: d.agentRuntimeArtifact || null,
          failureReason: d.failureReason || null,
        });
      }
      nextToken = res.nextToken;
    } while (nextToken);
  } catch (err) { results.errors.push({ step: "agentcore:ListAgentRuntimes", error: err.message }); }

  // ── 3. Bedrock Agents — all regions ──
  // DescribeRegions → scan each for Bedrock Agents
  var allRegions = [];
  try {
    var regRes = await ec2Client.send(new DescribeRegionsCommand({ AllRegions: false }));
    allRegions = (regRes.Regions || []).map(function (r) { return r.RegionName; });
  } catch (err) {
    results.errors.push({ step: "ec2:DescribeRegions", error: err.message });
    allRegions = [region];
  }

  for (var reg of allRegions) {
    try {
      var brClient = new BedrockAgentClient({ region: reg, credentials: credentials });
      var brNext;
      do {
        var brRes = await brClient.send(new ListAgentsCommand({ maxResults: 50, nextToken: brNext }));
        for (var agSummary of (brRes.agentSummaries || [])) {
          var agDetail = {};
          try {
            var agResp = await brClient.send(new GetAgentCommand({ agentId: agSummary.agentId }));
            agDetail = agResp.agent || {};
          } catch (e) { results.errors.push({ step: "bedrock:GetAgent(" + reg + "/" + agSummary.agentId + ")", error: e.message }); }
          results.bedrockAgents.push({
            agentType: "Bedrock Agent",
            agentId: agDetail.agentId || agSummary.agentId,
            name: agDetail.agentName || agSummary.agentName,
            description: agDetail.description || agSummary.description || "",
            status: agDetail.agentStatus || agSummary.agentStatus,
            region: reg,
            foundationModel: agDetail.foundationModel || null,
            instruction: agDetail.instruction || null,
            roleArn: agDetail.agentResourceRoleArn || null,
            agentArn: agDetail.agentArn || null,
            idleSessionTTLInSeconds: agDetail.idleSessionTTLInSeconds || null,
            createdAt: agDetail.createdAt || agSummary.createdAt,
            updatedAt: agDetail.updatedAt || agSummary.updatedAt,
            guardrailConfiguration: agDetail.guardrailConfiguration || null,
          });
        }
        brNext = brRes.nextToken;
      } while (brNext);
    } catch (err) {
      // Skip regions where Bedrock is not available
      if (err.name !== "UnrecognizedClientException" && err.name !== "UnknownEndpoint" && !err.message.includes("not available")) {
        results.errors.push({ step: "bedrock:ListAgents(" + reg + ")", error: err.message });
      }
    }
  }

  // ── 4. Gateways + Targets ──
  try {
    var gwNext;
    do {
      var gwRes = await agentcoreClient.send(new ListGatewaysCommand({ maxResults: 50, nextToken: gwNext }));
      for (var gw of (gwRes.items || [])) {
        var gwD = {};
        try { gwD = await agentcoreClient.send(new GetGatewayCommand({ gatewayIdentifier: gw.gatewayId })); } catch (e) { results.errors.push({ step: "agentcore:GetGateway(" + gw.gatewayId + ")", error: e.message }); }
        results.gateways.push({
          gatewayId: gwD.gatewayId || gw.gatewayId,
          gatewayArn: gwD.gatewayArn || null,
          name: gwD.name || gw.name,
          status: gwD.status || gw.status,
          description: gwD.description || gw.description || "",
          roleArn: gwD.roleArn || null,
          gatewayUrl: gwD.gatewayUrl || null,
          authorizerType: gw.authorizerType || null,
          authorizerConfiguration: gwD.authorizerConfiguration || null,
          protocolType: gw.protocolType || null,
          interceptors: gwD.interceptors || null,
          kmsKeyArn: gwD.kmsKeyArn || null,
          workloadIdentityDetails: gwD.workloadIdentityDetails || null,
          statusReasons: gwD.statusReasons || null,
          createdAt: gwD.createdAt || gw.createdAt,
          updatedAt: gwD.updatedAt || gw.updatedAt,
        });
        // Targets
        try {
          var tNext;
          do {
            var tRes = await agentcoreClient.send(new ListGatewayTargetsCommand({ gatewayIdentifier: gw.gatewayId, maxResults: 50, nextToken: tNext }));
            for (var t of (tRes.items || [])) {
              var tD = {};
              try { tD = await agentcoreClient.send(new GetGatewayTargetCommand({ gatewayIdentifier: gw.gatewayId, targetId: t.targetId })); } catch (e) { results.errors.push({ step: "agentcore:GetGatewayTarget(" + gw.gatewayId + "/" + t.targetId + ")", error: e.message }); }
              results.gatewayTargets.push({
                gatewayId: gw.gatewayId, gatewayName: gw.name,
                targetId: tD.targetId || t.targetId, name: tD.name || t.name,
                status: tD.status || t.status, description: tD.description || t.description || "",
                targetType: t.targetType || null, listingMode: t.listingMode || null,
                targetConfiguration: tD.targetConfiguration || null,
                credentialProviderConfigurations: tD.credentialProviderConfigurations || null,
                statusReasons: tD.statusReasons || null,
                createdAt: tD.createdAt || t.createdAt, updatedAt: tD.updatedAt || t.updatedAt,
              });
            }
            tNext = tRes.nextToken;
          } while (tNext);
        } catch (e) { results.errors.push({ step: "agentcore:ListGatewayTargets(" + gw.gatewayId + ")", error: e.message }); }
      }
      gwNext = gwRes.nextToken;
    } while (gwNext);
  } catch (err) { results.errors.push({ step: "agentcore:ListGateways", error: err.message }); }

  // ── 5. Workload Identities ──
  try {
    var wiNext;
    do {
      // NOTE: ListWorkloadIdentities caps maxResults at 20 (unlike ListAgentRuntimes=100).
      // Passing >20 throws ValidationException and silently yields 0 results. Pagination loop below handles the rest.
      var wiRes = await agentcoreClient.send(new ListWorkloadIdentitiesCommand({ maxResults: 20, nextToken: wiNext }));
      for (var wi of (wiRes.workloadIdentities || [])) {
        results.workloadIdentities.push({ name: wi.name, workloadIdentityArn: wi.workloadIdentityArn });
      }
      wiNext = wiRes.nextToken;
    } while (wiNext);
  } catch (err) { results.errors.push({ step: "agentcore:ListWorkloadIdentities", error: err.message }); }

  // ── 6. OAuth2 Credential Providers ──
  // NOTE: ListOauth2CredentialProviders caps maxResults at 20 (same as ListWorkloadIdentities).
  // The list call is thin (name/vendor/arn); the client_id, secret location, grant type and
  // discovery URL only come from GetOauth2CredentialProvider, so we Get each one.
  try {
    var opNext;
    do {
      var opRes = await agentcoreClient.send(new ListOauth2CredentialProvidersCommand({ maxResults: 20, nextToken: opNext }));
      for (var cp of (opRes.credentialProviders || [])) {
        var provider = {
          name: cp.name, vendor: cp.credentialProviderVendor || null,
          credentialProviderArn: cp.credentialProviderArn,
          createdTime: cp.createdTime, lastUpdatedTime: cp.lastUpdatedTime,
          clientId: null, clientSecretArn: null, clientSecretSource: null,
          clientAuthenticationMethod: null, discoveryUrl: null,
          onBehalfOfTokenExchange: null, callbackUrl: null, status: null,
          usedByAgents: [],
        };
        try {
          var det = await agentcoreClient.send(new GetOauth2CredentialProviderCommand({ name: cp.name }));
          provider.vendor = det.credentialProviderVendor || provider.vendor;
          provider.clientSecretArn = det.clientSecretArn || null;
          provider.clientSecretSource = det.clientSecretSource || null;
          provider.callbackUrl = det.callbackUrl || null;
          provider.status = det.status || null;
          // oauth2ProviderConfigOutput is a vendor-keyed union; scan its members for the config.
          var cfg = det.oauth2ProviderConfigOutput || {};
          for (var mk of Object.keys(cfg)) {
            var member = cfg[mk];
            if (member && typeof member === "object") {
              if (member.clientId) provider.clientId = member.clientId;
              if (member.clientAuthenticationMethod) provider.clientAuthenticationMethod = member.clientAuthenticationMethod;
              if (member.onBehalfOfTokenExchangeConfig) provider.onBehalfOfTokenExchange = member.onBehalfOfTokenExchangeConfig;
              if (member.oauthDiscovery) {
                provider.discoveryUrl = member.oauthDiscovery.discoveryUrl
                  || (member.oauthDiscovery.authorizationServerMetadata || {}).issuer || null;
              }
            }
          }
        } catch (e) { results.errors.push({ step: "agentcore:GetOauth2CredentialProvider(" + cp.name + ")", error: e.message }); }
        results.oauthProviders.push(provider);
      }
      opNext = opRes.nextToken;
    } while (opNext);
  } catch (err) { results.errors.push({ step: "agentcore:ListOauth2CredentialProviders", error: err.message }); }

  // ── 7. Cognito Users & Groups ──
  try {
    var cpNext;
    do {
      var poolRes = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 60, NextToken: cpNext }));
      for (var pool of (poolRes.UserPools || [])) {
        results.cognitoPools.push({ id: pool.Id, name: pool.Name });
        try {
          var gRes = await cognitoClient.send(new ListGroupsCommand({ UserPoolId: pool.Id, Limit: 60 }));
          for (var g of (gRes.Groups || [])) {
            var groupUsers = [];
            try {
              var guRes = await cognitoClient.send(new ListUsersInGroupCommand({ UserPoolId: pool.Id, GroupName: g.GroupName, Limit: 60 }));
              groupUsers = (guRes.Users || []).map(function (u) { return u.Username; });
            } catch (e) { results.errors.push({ step: "cognito:ListUsersInGroup(" + pool.Id + "/" + g.GroupName + ")", error: e.message }); }
            results.groups.push({
              poolId: pool.Id, poolName: pool.Name, groupName: g.GroupName,
              description: g.Description || "", roleArn: g.RoleArn || null,
              precedence: g.Precedence || null, users: groupUsers,
            });
          }
        } catch (err2) { results.errors.push({ step: "cognito:ListGroups(" + pool.Id + ")", error: err2.message }); }
        try {
          var uPag;
          do {
            var uRes = await cognitoClient.send(new ListUsersCommand({ UserPoolId: pool.Id, Limit: 60, PaginationToken: uPag }));
            for (var u of (uRes.Users || [])) {
              var attrs = {};
              (u.Attributes || []).forEach(function (a) { attrs[a.Name] = a.Value; });
              results.users.push({
                poolId: pool.Id, poolName: pool.Name, username: u.Username,
                attributes: attrs, email: attrs.email || null, name: attrs.name || null,
                phoneNumber: attrs.phone_number || null, emailVerified: attrs.email_verified || null,
                sub: attrs.sub || null, status: u.UserStatus, enabled: u.Enabled,
                userCreateDate: u.UserCreateDate || null, userLastModifiedDate: u.UserLastModifiedDate || null,
                mfaOptions: u.MFAOptions || null,
                groups: results.groups.filter(function (gr) { return gr.poolId === pool.Id && gr.users.includes(u.Username); }).map(function (gr) { return gr.groupName; }),
              });
            }
            uPag = uRes.PaginationToken;
          } while (uPag);
        } catch (err2) { results.errors.push({ step: "cognito:ListUsers(" + pool.Id + ")", error: err2.message }); }
        // App clients (M2M / user OAuth credentials)
        try {
          var acNext;
          do {
            var acRes = await cognitoClient.send(new ListUserPoolClientsCommand({ UserPoolId: pool.Id, MaxResults: 60, NextToken: acNext }));
            for (var ac of (acRes.UserPoolClients || [])) {
              var acDet = null;
              try {
                var dRes = await cognitoClient.send(new DescribeUserPoolClientCommand({ UserPoolId: pool.Id, ClientId: ac.ClientId }));
                acDet = dRes.UserPoolClient || null;
              } catch (e) { results.errors.push({ step: "cognito:DescribeUserPoolClient(" + ac.ClientId + ")", error: e.message }); }
              var flows = (acDet && acDet.AllowedOAuthFlows) || [];
              var hasSecret = !!(acDet && acDet.ClientSecret);
              var credType = flows.indexOf("client_credentials") >= 0 ? "M2M"
                : ((flows.indexOf("code") >= 0 || flows.indexOf("implicit") >= 0) ? "User (Auth Code)"
                : (hasSecret ? "Confidential" : "Public"));
              results.appClients.push({
                poolId: pool.Id, clientId: ac.ClientId,
                name: (acDet && acDet.ClientName) || ac.ClientName || ac.ClientId,
                credentialType: credType, hasSecret: hasSecret, oauthFlows: flows,
                createdDate: (acDet && acDet.CreationDate) || ac.CreationDate || null,
                lastModifiedDate: (acDet && acDet.LastModifiedDate) || ac.LastModifiedDate || null,
                // Token lifetimes — the blast-radius window for a credential that
                // has already been minted. A JWT is self-contained, so nothing can
                // recall it before it expires.
                accessTokenValidity: (acDet && acDet.AccessTokenValidity) || null,
                idTokenValidity: (acDet && acDet.IdTokenValidity) || null,
                refreshTokenValidity: (acDet && acDet.RefreshTokenValidity) || null,
                tokenValidityUnits: (acDet && acDet.TokenValidityUnits) || null,
                allowedOAuthScopes: (acDet && acDet.AllowedOAuthScopes) || [],
                enableTokenRevocation: (acDet && acDet.EnableTokenRevocation) != null ? acDet.EnableTokenRevocation : null,
                usedOutbound: [], usedInbound: [],
              });
            }
            acNext = acRes.NextToken;
          } while (acNext);
        } catch (err2) { results.errors.push({ step: "cognito:ListUserPoolClients(" + pool.Id + ")", error: err2.message }); }
      }
      cpNext = poolRes.NextToken;
    } while (cpNext);
  } catch (err) { results.errors.push({ step: "cognito:ListUserPools", error: err.message }); }

  // ── 8. Lambda Functions ──
  try {
    var lmMark;
    do {
      var lmRes = await lambdaClient.send(new ListFunctionsCommand({ MaxItems: 50, Marker: lmMark }));
      for (var fn of (lmRes.Functions || [])) {
        if (fn.FunctionName && fn.FunctionName.startsWith("healthsphere-")) {
          results.lambdaFunctions.push({
            functionName: fn.FunctionName, functionArn: fn.FunctionArn,
            runtime: fn.Runtime || null, role: fn.Role || null,
            handler: fn.Handler || null, codeSize: fn.CodeSize || null,
            timeout: fn.Timeout || null, memorySize: fn.MemorySize || null,
            lastModified: fn.LastModified || null, description: fn.Description || "",
            architectures: fn.Architectures || null,
          });
        }
      }
      lmMark = lmRes.NextMarker;
    } while (lmMark);
  } catch (err) { results.errors.push({ step: "lambda:ListFunctions", error: err.message }); }

  // ── 9. IAM Roles — trust policy filtered ──
  try {
    var iamMark;
    do {
      var iamRes = await iamClient.send(new ListRolesCommand({ MaxItems: 100, Marker: iamMark }));
      for (var r of (iamRes.Roles || [])) {
        var tp = parseTrustPolicy(typeof r.AssumeRolePolicyDocument === "string" ? r.AssumeRolePolicyDocument : JSON.stringify(r.AssumeRolePolicyDocument));
        var svcPrincipals = extractServicePrincipals(tp);
        var isRelevant = svcPrincipals.some(function (sp) {
          return NHI_SERVICE_PRINCIPALS.some(function (nsp) { return sp === nsp; });
        });
        if (!isRelevant) continue;

        // GetRole for full metadata
        var roleDetail = {};
        try {
          var rd = await iamClient.send(new GetRoleCommand({ RoleName: r.RoleName }));
          roleDetail = rd.Role || {};
        } catch (e) { results.errors.push({ step: "iam:GetRole(" + r.RoleName + ")", error: e.message }); }

        var fullTp = parseTrustPolicy(typeof roleDetail.AssumeRolePolicyDocument === "string" ? roleDetail.AssumeRolePolicyDocument : (roleDetail.AssumeRolePolicyDocument ? JSON.stringify(roleDetail.AssumeRolePolicyDocument) : null));

        results.iamRoles.push({
          roleName: roleDetail.RoleName || r.RoleName,
          roleId: roleDetail.RoleId || null,
          arn: roleDetail.Arn || r.Arn,
          path: roleDetail.Path || r.Path || "/",
          createDate: roleDetail.CreateDate || r.CreateDate,
          description: roleDetail.Description || "",
          maxSessionDuration: roleDetail.MaxSessionDuration || null,
          trustPolicy: fullTp || tp,
          servicePrincipals: svcPrincipals,
          permissionsBoundary: roleDetail.PermissionsBoundary || null,
          tags: roleDetail.Tags || [],
          roleLastUsed: roleDetail.RoleLastUsed || null,
          policies: [],
          usedBy: null,
          usedFor: null,
        });
      }
      iamMark = iamRes.Marker;
      if (!iamRes.IsTruncated) iamMark = null;
    } while (iamMark);
  } catch (err) { results.errors.push({ step: "iam:ListRoles", error: err.message }); }

  // ── 10. Fetch IAM policies per role ──
  for (var role of results.iamRoles) {
    // Managed
    try {
      var apMark;
      do {
        var apRes = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: role.roleName, Marker: apMark }));
        for (var ap of (apRes.AttachedPolicies || [])) {
          role.policies.push({ name: ap.PolicyName, arn: ap.PolicyArn, type: "managed", actions: null, resources: null });
        }
        apMark = apRes.IsTruncated ? apRes.Marker : null;
      } while (apMark);
    } catch (err) { results.errors.push({ step: "iam:ListAttachedRolePolicies(" + role.roleName + ")", error: err.message }); }
    // Inline
    try {
      var ipMark;
      var inlineNames = [];
      do {
        var ipRes = await iamClient.send(new ListRolePoliciesCommand({ RoleName: role.roleName, MaxItems: 100, Marker: ipMark }));
        inlineNames.push.apply(inlineNames, ipRes.PolicyNames || []);
        ipMark = ipRes.IsTruncated ? ipRes.Marker : null;
      } while (ipMark);
      for (var pn of inlineNames) {
        try {
          var pRes = await iamClient.send(new GetRolePolicyCommand({ RoleName: role.roleName, PolicyName: pn }));
          var doc = parseTrustPolicy(pRes.PolicyDocument);
          var actions = [], resources = [];
          for (var stmt of ((doc || {}).Statement || [])) {
            var sa = Array.isArray(stmt.Action) ? stmt.Action : (stmt.Action ? [stmt.Action] : []);
            var sr = Array.isArray(stmt.Resource) ? stmt.Resource : (stmt.Resource ? [stmt.Resource] : []);
            actions.push.apply(actions, sa);
            resources.push.apply(resources, sr);
          }
          role.policies.push({ name: pn, arn: null, type: "inline", actions: actions, resources: resources });
        } catch (err) { results.errors.push({ step: "iam:GetRolePolicy(" + role.roleName + "/" + pn + ")", error: err.message }); }
      }
    } catch (err) { results.errors.push({ step: "iam:ListRolePolicies(" + role.roleName + ")", error: err.message }); }
  }

  // ── 10b. IAM Users + long-lived credentials ──
  // Humans and legacy service accounts with console/CLI access. Two purposes:
  //   1.8  long-lived credential evidence (access key age + last used + MFA)
  //   1.1  validating a CloudTrail-proposed owner against a real principal
  // IAM is global; these calls are region-independent.
  try {
    var uMark;
    do {
      var uListRes = await iamClient.send(new ListIamUsersCommand({ MaxItems: 100, Marker: uMark }));
      for (var iu of (uListRes.Users || [])) {
        var userDetail = {};
        try {
          var udRes = await iamClient.send(new GetUserCommand({ UserName: iu.UserName }));
          userDetail = udRes.User || {};
        } catch (e) { results.errors.push({ step: "iam:GetUser(" + iu.UserName + ")", error: e.message }); }

        // Access keys — the long-lived credential surface.
        var keys = [];
        try {
          var akRes = await iamClient.send(new ListAccessKeysCommand({ UserName: iu.UserName }));
          for (var ak of (akRes.AccessKeyMetadata || [])) {
            var lastUsed = null;
            try {
              var luRes = await iamClient.send(new GetAccessKeyLastUsedCommand({ AccessKeyId: ak.AccessKeyId }));
              lastUsed = luRes.AccessKeyLastUsed || null;
            } catch (e) { results.errors.push({ step: "iam:GetAccessKeyLastUsed(" + ak.AccessKeyId + ")", error: e.message }); }
            var ageDays = ak.CreateDate ? Math.floor((Date.now() - new Date(ak.CreateDate).getTime()) / 86400000) : null;
            var idleDays = (lastUsed && lastUsed.LastUsedDate)
              ? Math.floor((Date.now() - new Date(lastUsed.LastUsedDate).getTime()) / 86400000)
              : null;
            keys.push({
              accessKeyId: ak.AccessKeyId, status: ak.Status, createDate: ak.CreateDate,
              ageDays: ageDays,
              lastUsedDate: lastUsed ? lastUsed.LastUsedDate || null : null,
              lastUsedService: lastUsed ? lastUsed.ServiceName || null : null,
              lastUsedRegion: lastUsed ? lastUsed.Region || null : null,
              idleDays: idleDays,
              neverUsed: !!(lastUsed && !lastUsed.LastUsedDate),
            });
          }
        } catch (e) { results.errors.push({ step: "iam:ListAccessKeys(" + iu.UserName + ")", error: e.message }); }

        var mfa = [];
        try {
          var mfaRes = await iamClient.send(new ListMFADevicesCommand({ UserName: iu.UserName }));
          mfa = (mfaRes.MFADevices || []).map(function (m) { return { serialNumber: m.SerialNumber, enableDate: m.EnableDate }; });
        } catch (e) { results.errors.push({ step: "iam:ListMFADevices(" + iu.UserName + ")", error: e.message }); }

        var userGroups = [];
        try {
          var ugRes = await iamClient.send(new ListGroupsForUserCommand({ UserName: iu.UserName }));
          userGroups = (ugRes.Groups || []).map(function (g) { return g.GroupName; });
        } catch (e) { results.errors.push({ step: "iam:ListGroupsForUser(" + iu.UserName + ")", error: e.message }); }

        var userPolicies = [];
        try {
          var aupRes = await iamClient.send(new ListAttachedUserPoliciesCommand({ UserName: iu.UserName }));
          for (var aup of (aupRes.AttachedPolicies || [])) userPolicies.push({ name: aup.PolicyName, arn: aup.PolicyArn, type: "managed" });
        } catch (e) { results.errors.push({ step: "iam:ListAttachedUserPolicies(" + iu.UserName + ")", error: e.message }); }
        try {
          var upRes = await iamClient.send(new ListUserPoliciesCommand({ UserName: iu.UserName }));
          for (var upn of (upRes.PolicyNames || [])) userPolicies.push({ name: upn, arn: null, type: "inline" });
        } catch (e) { results.errors.push({ step: "iam:ListUserPolicies(" + iu.UserName + ")", error: e.message }); }

        var tagMap = {};
        (userDetail.Tags || iu.Tags || []).forEach(function (t) { tagMap[t.Key] = t.Value; });

        var activeKeys = keys.filter(function (k) { return k.Status === "Active"; });
        var oldestActive = activeKeys.reduce(function (m, k) { return (k.ageDays != null && (m == null || k.ageDays > m)) ? k.ageDays : m; }, null);

        results.iamUsers.push({
          userName: userDetail.UserName || iu.UserName,
          userId: userDetail.UserId || iu.UserId,
          arn: userDetail.Arn || iu.Arn,
          path: userDetail.Path || iu.Path || "/",
          createDate: userDetail.CreateDate || iu.CreateDate,
          passwordLastUsed: userDetail.PasswordLastUsed || iu.PasswordLastUsed || null,
          tags: tagMap,
          email: tagMap.email || tagMap.Email || null,
          groups: userGroups,
          policies: userPolicies,
          mfaDevices: mfa,
          mfaEnabled: mfa.length > 0,
          accessKeys: keys,
          activeKeyCount: activeKeys.length,
          oldestActiveKeyAgeDays: oldestActive,
          hasLongLivedCredential: activeKeys.length > 0,
        });
      }
      uMark = uListRes.IsTruncated ? uListRes.Marker : null;
    } while (uMark);
  } catch (err) { results.errors.push({ step: "iam:ListUsers", error: err.message }); }

  // ── 11. Relationship mapping ──
  function linkRole(roleArn, usedByType, usedByName, usedById, usedFor) {
    if (!roleArn) return;
    var role = results.iamRoles.find(function (r) { return r.arn === roleArn; });
    if (role) { role.usedBy = { type: usedByType, name: usedByName, id: usedById }; role.usedFor = usedFor; }
  }

  for (var ac of results.agentcoreAgents) {
    linkRole(ac.roleArn, "AgentCore Agent", ac.name, ac.agentRuntimeId, "AgentCore Runtime execution");
  }
  for (var ba of results.bedrockAgents) {
    linkRole(ba.roleArn, "Bedrock Agent", ba.name, ba.agentId, "Bedrock Agent execution");
  }
  for (var gw2 of results.gateways) {
    linkRole(gw2.roleArn, "Gateway", gw2.name, gw2.gatewayId, "Invoke gateway targets");
  }
  for (var fn2 of results.lambdaFunctions) {
    linkRole(fn2.role, "Lambda", fn2.functionName, fn2.functionArn, "Access downstream resources");
  }

  // ── 12. Build NHI roster ──
  for (var role2 of results.iamRoles) {
    var nhiSubType = "IAM Role";
    if (role2.usedBy) {
      if (role2.usedBy.type === "AgentCore Agent" || role2.usedBy.type === "Bedrock Agent") nhiSubType = "Agent Execution Role";
      else if (role2.usedBy.type === "Gateway") nhiSubType = "Gateway Execution Role";
      else if (role2.usedBy.type === "Lambda") nhiSubType = "Lambda Execution Role";
    }
    results.nhis.push({
      nhiType: "IAM Role", nhiSubType: nhiSubType,
      name: role2.roleName, arn: role2.arn,
      usedBy: role2.usedBy, usedFor: role2.usedFor,
      policies: role2.policies, trustPolicy: role2.trustPolicy,
      servicePrincipals: role2.servicePrincipals,
      description: role2.description, createDate: role2.createDate,
      roleLastUsed: role2.roleLastUsed, maxSessionDuration: role2.maxSessionDuration,
      tags: role2.tags,
    });
  }
  for (var wi2 of results.workloadIdentities) {
    var wiUsedBy = null;
    for (var ac2 of results.agentcoreAgents) {
      if (ac2.workloadIdentityDetails && ac2.workloadIdentityDetails.workloadIdentityArn === wi2.workloadIdentityArn) {
        wiUsedBy = { type: "AgentCore Agent", name: ac2.name, id: ac2.agentRuntimeId };
      }
    }
    results.nhis.push({
      nhiType: "Workload Identity", nhiSubType: "Workload Identity",
      name: wi2.name, arn: wi2.workloadIdentityArn,
      usedBy: wiUsedBy, usedFor: wiUsedBy ? "Workload access token for " + wiUsedBy.name : "Workload access token",
      policies: null, trustPolicy: null,
    });
  }
  // ── Map agent → OAuth provider via the scoped GetResourceOauth2Token IAM grant ──
  // The binding is the least-privilege policy on the agent's execution role that allows
  // GetResourceOauth2Token on a specific credential-provider ARN. We read it straight from
  // the already-discovered role policies — no env vars, no hardcoding.
  function roleGrantsProvider(role, providerArn) {
    if (!role || !providerArn) return false;
    return (role.policies || []).some(function (pol) {
      var hasAction = (pol.actions || []).some(function (a) {
        return a === "bedrock-agentcore:GetResourceOauth2Token" || a === "bedrock-agentcore:*" || a === "*";
      });
      var hasResource = (pol.resources || []).some(function (r) {
        return r === providerArn || r === "*";
      });
      return hasAction && hasResource;
    });
  }

  for (var prov of results.oauthProviders) {
    for (var ag of results.agentcoreAgents) {
      if (!ag.roleArn) continue;
      var agRole = results.iamRoles.find(function (r) { return r.arn === ag.roleArn; });
      if (roleGrantsProvider(agRole, prov.credentialProviderArn)) {
        prov.usedByAgents.push({
          agentName: ag.name, agentRuntimeArn: ag.agentRuntimeArn, roleArn: ag.roleArn,
        });
        ag.outboundAuth = ag.outboundAuth || [];
        ag.outboundAuth.push({
          providerName: prov.name, providerArn: prov.credentialProviderArn,
          clientId: prov.clientId, vendor: prov.vendor,
        });
      }
    }
  }

  // ── OAuth providers as OutboundAuth NHIs (with client_id + who uses them) ──
  for (var op2 of results.oauthProviders) {
    results.nhis.push({
      nhiType: "OAuth Credential Provider", nhiSubType: "OutboundAuth",
      name: op2.name, arn: op2.credentialProviderArn, vendor: op2.vendor,
      clientId: op2.clientId,
      clientSecretArn: op2.clientSecretArn,
      clientSecretSource: op2.clientSecretSource,
      clientAuthenticationMethod: op2.clientAuthenticationMethod,
      onBehalfOfTokenExchange: op2.onBehalfOfTokenExchange,
      discoveryUrl: op2.discoveryUrl,
      status: op2.status,
      usedBy: op2.usedByAgents.length
        ? { type: "Agent", name: op2.usedByAgents.map(function (u) { return u.agentName; }).join(", "), id: op2.usedByAgents[0].agentRuntimeArn }
        : null,
      usedByAgents: op2.usedByAgents,
      usedFor: "Agent-to-gateway M2M authentication (outbound)",
      policies: null, trustPolicy: null,
      createdTime: op2.createdTime, lastUpdatedTime: op2.lastUpdatedTime,
      secret: op2.secret || null,
    });
  }

  // ── Secret posture: DescribeSecret on every credential provider's secret ──
  //
  // Read-only metadata only. GetSecretValue is deliberately NOT called — discovery
  // never reads secret material, it only reports custody and lifecycle state.
  //
  // Two ownership models, which must be presented differently:
  //   MANAGED  - AgentCore Identity created and owns the secret (name is prefixed
  //              "bedrock-agentcore-identity!", OwningService is set). Rotation,
  //              CMK and tags are not configurable, so those fields are omitted
  //              rather than shown as null - a null would read as a gap when it is
  //              simply not applicable.
  //   EXTERNAL - the customer owns the secret. Rotation, CMK, tags and versioning
  //              are all reportable, and are the evidence for crypto lifecycle.
  var smClient = new SecretsManagerClient({ region: region, credentials: credentials });

  function secretArnOf(prov) {
    var a = prov.clientSecretArn;
    if (!a) return null;
    if (typeof a === "string") return a;
    return a.secretArn || a.secretId || null;
  }

  for (var provS of results.oauthProviders) {
    var sArn = secretArnOf(provS);
    provS.secretArnResolved = sArn;
    if (!sArn) { provS.secret = null; continue; }

    var det = null;
    try {
      det = await smClient.send(new DescribeSecretCommand({ SecretId: sArn }));
    } catch (e) {
      results.errors.push({ step: "secretsmanager:DescribeSecret(" + provS.name + ")", error: e.message });
      provS.secret = { arn: sArn, unreadable: true, error: e.message };
      continue;
    }

    var owningService = det.OwningService || null;
    var serviceManaged = !!owningService || String(det.Name || "").indexOf("!") > 0;
    var tagMap = {};
    (det.Tags || []).forEach(function (t) { if (t.Key.indexOf("aws:") !== 0) tagMap[t.Key] = t.Value; });

    var base = {
      arn: det.ARN,
      name: det.Name,
      ownership: serviceManaged ? "MANAGED" : "EXTERNAL",
      owningService: owningService,
      createdDate: det.CreatedDate || null,
      lastChangedDate: det.LastChangedDate || null,
      lastAccessedDate: det.LastAccessedDate || null,
      deletedDate: det.DeletedDate || null,
      pendingDeletion: !!det.DeletedDate,
    };

    if (serviceManaged) {
      // Rotation / CMK / tags are not customer-configurable here. Omit them so the
      // UI can say "managed by AWS" instead of rendering empty fields.
      base.configurable = false;
      base.note = "Secret is created and managed by " + (owningService || "the service")
        + ". Rotation schedule, customer-managed key and tags cannot be configured.";
      base.rotatable = false;
    } else {
      base.configurable = true;
      base.rotatable = !!det.RotationLambdaARN;
      base.rotationEnabled = det.RotationEnabled === true;
      base.rotationLambdaArn = det.RotationLambdaARN || null;
      base.rotationRules = det.RotationRules || null;
      base.lastRotatedDate = det.LastRotatedDate || null;
      base.nextRotationDate = det.NextRotationDate || null;
      base.kmsKeyId = det.KmsKeyId || null;
      base.customerManagedKey = !!det.KmsKeyId;
      base.tags = tagMap;
      base.versionStages = det.VersionIdsToStages || null;
      base.versionCount = det.VersionIdsToStages ? Object.keys(det.VersionIdsToStages).length : 0;
      base.everRotated = !!det.LastRotatedDate;
    }

    // Single posture label for the inventory row.
    base.posture = serviceManaged ? "Service-managed"
      : (base.rotationEnabled && base.customerManagedKey ? "Governed"
      : (base.rotationEnabled ? "Rotating (AWS-managed key)"
      : "Customer-managed, no rotation"));

    provS.secret = base;
  }

  // ── Map app-client credentials (M2M / OAuth) → inbound & outbound usage ──
  // A client_id is one credential. It can be PRESENTED outbound (an agent authenticates
  // as it, via a credential provider) and ACCEPTED inbound (a runtime/gateway lists it in
  // allowedClients). Same credential, two directions — not two NHIs.
  function acceptsClient(cfg, clientId) {
    var jw = cfg && cfg.customJWTAuthorizer;
    return !!(jw && (jw.allowedClients || []).indexOf(clientId) >= 0);
  }
  for (var cred of results.appClients) {
    for (var pv of results.oauthProviders) {
      if (pv.clientId && pv.clientId === cred.clientId) {
        for (var ua of (pv.usedByAgents || [])) {
          cred.usedOutbound.push({ type: "Agent", name: ua.agentName, via: pv.name });
        }
      }
    }
    for (var agc of results.agentcoreAgents) {
      if (acceptsClient(agc.authorizerConfiguration, cred.clientId)) {
        cred.usedInbound.push({ type: "Agent", name: agc.name });
      }
    }
    for (var gwc of results.gateways) {
      if (acceptsClient(gwc.authorizerConfiguration, cred.clientId)) {
        cred.usedInbound.push({ type: "Gateway", name: gwc.name });
      }
    }
  }

  // Emit each app-client credential as an NHI, carrying both usage directions.
  for (var cred2 of results.appClients) {
    var outNames = cred2.usedOutbound.map(function (u) { return u.name; });
    var inNames = cred2.usedInbound.map(function (u) { return u.name; });
    var summary = [
      outNames.length ? "out: " + outNames.join(", ") : null,
      inNames.length ? "in: " + inNames.join(", ") : null,
    ].filter(Boolean).join("  |  ");
    results.nhis.push({
      nhiType: "M2M Credential", nhiSubType: cred2.credentialType,
      name: cred2.name, arn: null, clientId: cred2.clientId,
      credentialType: cred2.credentialType, hasSecret: cred2.hasSecret, oauthFlows: cred2.oauthFlows,
      usedOutbound: cred2.usedOutbound, usedInbound: cred2.usedInbound,
      usedBy: summary ? { type: "Credential", name: summary } : null,
      usedFor: "OAuth client credential — presented outbound / accepted inbound",
      policies: null, trustPolicy: null, createdTime: null, lastUpdatedTime: null,
    });
  }

  // ── 13. Blend gateway targets with Lambda ──
  for (var tgt of results.gatewayTargets) {
    var matchFn = results.lambdaFunctions.find(function (f) {
      return f.functionName === tgt.name || tgt.name.includes(f.functionName);
    });
    tgt.lambdaDetails = matchFn || null;
    if (matchFn && matchFn.role) {
      var fnRole = results.iamRoles.find(function (r) { return r.arn === matchFn.role; });
      tgt.executionRole = fnRole ? { roleName: fnRole.roleName, arn: fnRole.arn, policies: fnRole.policies, usedBy: fnRole.usedBy, usedFor: fnRole.usedFor } : null;
    } else {
      tgt.executionRole = null;
    }
  }

  // ── Summary ──
  results.summary = {
    agentcoreAgents: results.agentcoreAgents.length,
    bedrockAgents: results.bedrockAgents.length,
    agents: results.agentcoreAgents.length + results.bedrockAgents.length,
    gateways: results.gateways.length,
    gatewayTargets: results.gatewayTargets.length,
    workloadIdentities: results.workloadIdentities.length,
    oauthProviders: results.oauthProviders.length,
    appClients: results.appClients.length,
    users: results.users.length,
    groups: results.groups.length,
    lambdaFunctions: results.lambdaFunctions.length,
    iamRoles: results.iamRoles.length,
    iamUsers: results.iamUsers.length,
    providersServiceManaged: results.oauthProviders.filter(function (p) { return p.secret && p.secret.ownership === "MANAGED"; }).length,
    providersCustomerManaged: results.oauthProviders.filter(function (p) { return p.secret && p.secret.ownership === "EXTERNAL"; }).length,
    providersRotatable: results.oauthProviders.filter(function (p) { return p.secret && p.secret.rotatable; }).length,
    providersNeverRotated: results.oauthProviders.filter(function (p) { return p.secret && p.secret.configurable && !p.secret.everRotated; }).length,
    providersWithoutCmk: results.oauthProviders.filter(function (p) { return p.secret && p.secret.configurable && !p.secret.customerManagedKey; }).length,
    iamUsersWithLongLivedKeys: results.iamUsers.filter(function (u) { return u.hasLongLivedCredential; }).length,
    iamUsersWithoutMfa: results.iamUsers.filter(function (u) { return !u.mfaEnabled; }).length,
    nhis: results.nhis.length,
    regionsScanned: allRegions.length,
    errors: results.errors.length,
  };

  // ── 14. Enrichment: resource tags, observed model (CloudTrail), drift ──
  // Runs last: it reads agentcoreAgents / bedrockAgents / gateways / iamRoles
  // and augments results.summary with the drift counters.
  try {
    await enrichDiscovery(results, {
      region: region,
      credentials: credentials,
      lookbackDays: Number(process.env.REVA_MODEL_LOOKBACK_DAYS || 7),
    });
  } catch (err) {
    results.errors.push({ step: "enrichDiscovery", error: err.message });
  }

  return results;
}

module.exports = { runDiscovery };
