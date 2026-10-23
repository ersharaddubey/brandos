const express = require('express');
const store = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const EMPTY = {
  introduction: '',
  experienceLevel: '',
  totalExperience: '',
  languages: [],
  frontend: [],
  databases: [],
  projects: [],
  remarks: '',
};

router.get('/', authRequired, (req, res) => {
  const profiles = store.profiles();
  const techProfile = { ...EMPTY, ...(profiles[req.user.id] || {}) };
  res.json({ success: true, techProfile });
});

router.put('/tech', authRequired, (req, res) => {
  const body = req.body || {};
  const techProfile = {
    introduction: body.introduction || '',
    experienceLevel: body.experienceLevel || '',
    totalExperience: body.totalExperience || '',
    languages: Array.isArray(body.languages) ? body.languages : [],
    frontend: Array.isArray(body.frontend) ? body.frontend : [],
    databases: Array.isArray(body.databases) ? body.databases : [],
    projects: Array.isArray(body.projects) ? body.projects : [],
    remarks: body.remarks || '',
  };
  const profiles = store.profiles();
  profiles[req.user.id] = techProfile;
  store.saveProfiles(profiles);
  res.json({ success: true, techProfile });
});

module.exports = router;
