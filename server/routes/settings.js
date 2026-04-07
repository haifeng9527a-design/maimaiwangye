const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../auth");
const { sanitizeSettings } = require("../utils");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const row = await db.getSettings();
    res.json({ settings: sanitizeSettings(row) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/", requireAdmin, async (req, res) => {
  try {
    const row = await db.updateSettings(req.body || {});
    res.json({ settings: sanitizeSettings(row) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
