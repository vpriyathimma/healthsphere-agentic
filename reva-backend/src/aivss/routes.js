// AIVSS scoring endpoint.
//
// Abhilasha's dashboard calls this instead of loading a fixed JSON. Amit:
// "she'll give you one API, that API you have to call, and her API will return
// the values in a way that allows you to render this UI."
//
// So the response is the same `aivss` block her file already carries, field for
// field — no new shape to adopt on her side.

const express = require("express");
const { score, CONTRACT } = require("./score");

const router = express.Router();

// POST /api/aivss/score
//
// Body: one agent, or { agents: [...] } for a batch. Accepts either the
// inventory shape (identity / inventoryRow / capabilitiesRisk) or a flat
// object — discovery will not always fill the same fields.
router.post("/score", (req, res) => {
  const body = req.body || {};
  try {
    if (Array.isArray(body.agents)) {
      return res.json({
        scored: body.agents.length,
        results: body.agents.map((a) => ({
          id: a.id ?? (a.identity || {}).agentId ?? null,
          aivss: score(a),
        })),
      });
    }
    return res.json({ aivss: score(body) });
  } catch (e) {
    // A scoring failure must not read as a zero. A zero is a claim about risk;
    // an error is the absence of one, and the UI has to be able to tell them
    // apart.
    console.error("aivss scoring failed:", e && e.message);
    return res.status(422).json({
      error: "scoring_failed",
      message: "Could not score this agent from the metadata supplied.",
      detail: e && e.message,
    });
  }
});

// GET /api/aivss/contract — the methodology in force: bands, multipliers,
// mitigation levels, the rubric, the catalogues. Exposed so the UI can render
// a legend from the same source the score came from, rather than a copy that
// drifts.
router.get("/contract", (_req, res) => res.json(CONTRACT));

module.exports = router;
