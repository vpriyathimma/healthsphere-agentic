import os

from mcp.client.streamable_http import streamablehttp_client
from strands.tools.mcp.mcp_client import MCPClient

# Gateway MCP endpoint (env-overridable). No client id/secret here — the token is
# minted by AgentCore Identity from the credential provider and passed in.
GATEWAY_URL = os.environ.get(
    "AGENTCORE_GATEWAY_URL",
    "https://healthsphere-gateway-krackytzcf.gateway.bedrock-agentcore.us-west-2.amazonaws.com/mcp",
)


def get_streamable_http_mcp_client(access_token: str) -> MCPClient:
    """MCP client to the HealthSphere gateway, authenticated with the agent's
    vault-issued access token. No secret in code or env."""
    return MCPClient(
        lambda: streamablehttp_client(
            GATEWAY_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
    )
