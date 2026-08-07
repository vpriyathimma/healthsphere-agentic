import os
import logging
from mcp.client.streamable_http import streamablehttp_client
from strands.tools.mcp.mcp_client import MCPClient

logger = logging.getLogger(__name__)

GATEWAY_URL = os.environ.get(
    "AGENTCORE_GATEWAY_URL",
    "https://healthsphere-gateway-krackytzcf.gateway.bedrock-agentcore.us-west-2.amazonaws.com/mcp"
)

def get_streamable_http_mcp_client() -> MCPClient:
    return MCPClient(lambda: streamablehttp_client(GATEWAY_URL))
