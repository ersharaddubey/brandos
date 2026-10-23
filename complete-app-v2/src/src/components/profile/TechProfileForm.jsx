/**
 * FILE: frontend/src/components/profile/TechProfileForm.jsx
 * PURPOSE: Lets the user set their tech background — feeds AI prompt
 * context in every mode via server/src/infrastructure/ai/promptBuilder.js.
 * Entirely optional to fill in; empty stays empty, no forced defaults.
 */

import { useEffect, useState } from 'react';
import ProjectRow from './ProjectRow';

const LANGUAGE_OPTIONS = ['php', 'python', 'node', 'java', 'dotnet'];
const FRONTEND_OPTIONS = ['react', 'angular'];
const DATABASE_OPTIONS = ['mysql', 'mongodb'];
const EXPERIENCE_LEVELS = ['junior', 'mid', 'senior'];

function makeProject() {
  return { name: '', description: '', techUsed: [] };
}

function toggleInArray(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export default function TechProfileForm({ techProfile, onSave, isSubmitting, error }) {
  const [form, setForm] = useState(techProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(techProfile);
  }, [techProfile]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateProject = (index, next) => {
    const projects = [...form.projects];
    projects[index] = next;
    updateField('projects', projects);
  };

  const removeProject = (index) => {
    updateField('projects', form.projects.filter((_, i) => i !== index));
  };

  const addProject = () => updateField('projects', [...form.projects, makeProject()]);

  const handleSubmit = async () => {
    setSaved(false);
    const ok = await onSave(form);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="plan-screen">
      <div className="plan-screen__header">
        <h2>Your tech profile</h2>
        <p className="plan-screen__subtitle">
          This gives the assistant context about your background — used across
          voice, chat, and screenshot answers. Entirely optional.
        </p>
      </div>

      {error && <div className="banner banner--error">{error}</div>}
      {saved && <div className="banner banner--success">Profile updated successfully</div>}

      <div className="plan-form">
        <label className="plan-form__label">Introduction</label>
        <textarea
          className="plan-form__input"
          rows={3}
          placeholder="A short intro about your background..."
          value={form.introduction}
          onChange={(e) => updateField('introduction', e.target.value)}
        />

        <label className="plan-form__label">Experience level</label>
        <select
          className="plan-form__input"
          value={form.experienceLevel}
          onChange={(e) => updateField('experienceLevel', e.target.value)}
        >
          <option value="">Not set</option>
          {EXPERIENCE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>

        <label className="plan-form__label">Total experience</label>
        <input
          className="plan-form__input"
          placeholder="e.g. 5 years"
          value={form.totalExperience}
          onChange={(e) => updateField('totalExperience', e.target.value)}
        />

        <label className="plan-form__label">Languages</label>
        <div className="provider-row__modes">
          {LANGUAGE_OPTIONS.map((lang) => (
            <label key={lang} className={`mode-chip ${form.languages.includes(lang) ? 'mode-chip--active' : ''}`}>
              <input
                type="checkbox"
                checked={form.languages.includes(lang)}
                onChange={() => updateField('languages', toggleInArray(form.languages, lang))}
              />
              {lang}
            </label>
          ))}
        </div>

        <label className="plan-form__label">Frontend</label>
        <div className="provider-row__modes">
          {FRONTEND_OPTIONS.map((fe) => (
            <label key={fe} className={`mode-chip ${form.frontend.includes(fe) ? 'mode-chip--active' : ''}`}>
              <input
                type="checkbox"
                checked={form.frontend.includes(fe)}
                onChange={() => updateField('frontend', toggleInArray(form.frontend, fe))}
              />
              {fe}
            </label>
          ))}
        </div>

        <label className="plan-form__label">Databases</label>
        <div className="provider-row__modes">
          {DATABASE_OPTIONS.map((db) => (
            <label key={db} className={`mode-chip ${form.databases.includes(db) ? 'mode-chip--active' : ''}`}>
              <input
                type="checkbox"
                checked={form.databases.includes(db)}
                onChange={() => updateField('databases', toggleInArray(form.databases, db))}
              />
              {db}
            </label>
          ))}
        </div>

        <div className="plan-form__providers">
          <label className="plan-form__label">Projects</label>
          {form.projects.map((project, i) => (
            <ProjectRow
              key={i}
              project={project}
              onChange={(next) => updateProject(i, next)}
              onRemove={() => removeProject(i)}
            />
          ))}
          <button type="button" className="link-btn" onClick={addProject}>
            + Add another project
          </button>
        </div>

        <label className="plan-form__label">Remarks</label>
        <textarea
          className="plan-form__input"
          rows={2}
          placeholder="Anything else worth mentioning..."
          value={form.remarks}
          onChange={(e) => updateField('remarks', e.target.value)}
        />

        {error && <div className="banner banner--error">{error}</div>}
        {saved && <div className="banner banner--success">Profile updated successfully</div>}


        <button className="respond-btn" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <span className="respond-btn__spinner" aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}