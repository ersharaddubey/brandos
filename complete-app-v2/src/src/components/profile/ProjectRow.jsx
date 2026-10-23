/**
 * FILE: frontend/src/components/profile/ProjectRow.jsx
 * PURPOSE: One repeatable project entry in the tech profile form — name,
 * description, free-text tech tags (NOT restricted to the profile's
 * main language/frontend/database selections — a project can mention
 * anything, including old tech no longer in active use).
 */

export default function ProjectRow({ project, onChange, onRemove }) {
  const handleTechChange = (raw) => {
    const techUsed = raw.split(',').map((t) => t.trim()).filter(Boolean);
    onChange({ ...project, techUsed });
  };

  return (
    <div className="project-row">
      <div className="project-row__top">
        <input
          className="plan-form__input"
          placeholder="Project name"
          value={project.name}
          onChange={(e) => onChange({ ...project, name: e.target.value })}
        />
        <button type="button" className="link-btn" onClick={onRemove}>
          Remove
        </button>
      </div>
      <textarea
        className="plan-form__input"
        placeholder="Short description"
        rows={2}
        value={project.description}
        onChange={(e) => onChange({ ...project, description: e.target.value })}
      />
      <input
        className="plan-form__input"
        placeholder="Tech used (comma separated — e.g. node, react, mongodb)"
        value={project.techUsed.join(', ')}
        onChange={(e) => handleTechChange(e.target.value)}
      />
    </div>
  );
}