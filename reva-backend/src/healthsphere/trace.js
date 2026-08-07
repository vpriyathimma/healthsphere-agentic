// W3C traceparent — originated by the BFF, forwarded on every downstream hop.
const crypto = require("node:crypto");
const newTraceId = () => crypto.randomBytes(16).toString("hex");
const newSpanId = () => crypto.randomBytes(8).toString("hex");
const traceparent = (traceId, spanId) => `00-${traceId}-${spanId || newSpanId()}-01`;
module.exports = { newTraceId, newSpanId, traceparent };
