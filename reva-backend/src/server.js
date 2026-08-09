const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const { runDiscovery } = require("./connectors/aws-agentcore/discovery");
const healthsphereRouter = require("./healthsphere/routes");
const credentialRoutes = require("./actions/credentials");

const app = express();
app.set("trust proxy", 1); // Render terminates TLS upstream
app.use(cors());

// MUST come before express.json(). Slack signs the RAW request body, and the
// global JSON middleware consumes and discards it — after which the HMAC can
// never be reproduced and every interactivity POST fails verification for a
// reason that looks like a wrong signing secret.
app.use("/healthsphere/slack/interactivity",
        express.raw({ type: "*/*", limit: "1mb" }));

app.use(express.json());

// Session — used ONLY by the /healthsphere clinical app. The Reva dashboard ("/")
// stays open exactly as before. In-memory store is fine for a single Render
// instance (demo); it resets on redeploy.
app.use(session({
  name: "hs.sid",
  secret: process.env.HS_SESSION_SECRET || "dev-only-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 8 },
}));

// ── HealthSphere clinical app (authenticated) at /healthsphere ──
app.use("/healthsphere", healthsphereRouter);

// This service hosts two products: the Reva dashboard at / and the clinical app
// at /healthsphere. On a deployment where only the clinical app is used, having
// to type the path is friction — and the bare URL renders an unconfigured
// dashboard, which reads as a broken deploy.
//
// Opt-in, so the default behaviour is unchanged for anyone using the dashboard.
if (process.env.HS_ROOT_REDIRECT === "true") {
  app.get("/", (_req, res) => res.redirect("/healthsphere"));
}

// Serve dashboard + static assets (also serves /healthsphere.css and /healthsphere/hs-app.jsx)
app.use(express.static(path.join(__dirname, "../dashboard")));

// ── Reva governance API (open, unchanged) ──
let discoveryCache = null;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "reva-healthsphere-backend", connected: !!discoveryCache, discoveredAt: discoveryCache?.discoveredAt || null });
});

app.post("/api/discovery/run", async (req, res) => {
  try {
    const region = req.body.region || process.env.REVA_AWS_REGION || process.env.AWS_REGION || "us-west-2";
    const accessKeyId = req.body.accessKeyId || process.env.REVA_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = req.body.secretAccessKey || process.env.REVA_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) return res.status(400).json({ error: "AWS credentials required. Set env vars or pass in body." });
    const results = await runDiscovery({ region, accessKeyId, secretAccessKey });
    discoveryCache = results;
    res.json(results);
  } catch (err) {
    console.error("Discovery failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Agent credential activate / inactivate (IAM inline policy delete + put).
// Reads the execution role from the current discovery snapshot.
app.use("/api/agents", credentialRoutes(() => discoveryCache));

app.get("/api/discovery", (_req, res) => {
  if (!discoveryCache) return res.status(404).json({ error: "No discovery data. Run POST /api/discovery/run first." });
  res.json(discoveryCache);
});
app.get("/api/discovery/summary", (_req, res) => {
  if (!discoveryCache) return res.status(404).json({ error: "No discovery data." });
  res.json(discoveryCache.summary);
});

// Fallback to the Reva dashboard for any other route.
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "../dashboard/index.html")));

const PORT = process.env.PORT || 4400;
app.listen(PORT, () => console.log(`Reva HealthSphere backend running on port ${PORT}`));
