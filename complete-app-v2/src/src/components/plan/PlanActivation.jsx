// /**
//  * FILE: frontend/src/components/plan/PlanActivation.jsx
//  * PURPOSE: Screen shown when a logged-in user has no active plan — the
//  * real UI replacement for what we were testing via Postman. Collects an
//  * AssemblyAI key (required) + at least one AI provider (Groq/Gemini/
//  * Mistral) tagged with which mode(s) it powers, plus terms acceptance,
//  * then calls the SAME /api/plan/activate-l1 endpoint we already proved
//  * works.
//  *
//  * Receives activateL1/isSubmitting/error as PROPS from a single
//  * App.jsx-level usePlan() instance — does not call usePlan() itself, to
//  * avoid two independent fetches of the same plan state.
//  */

// import { useState } from 'react';
// import ProviderKeyRow from './ProviderKeyRow';

// function makeRow() {
//   return {
//     id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
//     name: 'groq',
//     key: '',
//     useFor: [],
//   };
// }

// export default function PlanActivation({ activateL1, isSubmitting, error, onActivated }) {
//   const [assemblyaiKey, setAssemblyaiKey] = useState('');
//   const [rows, setRows] = useState([makeRow()]);
//   const [termsAccepted, setTermsAccepted] = useState(false);
//   const [localError, setLocalError] = useState(null);

//   const claimedModesExcept = (rowId) =>
//     rows.filter((r) => r.id !== rowId).flatMap((r) => r.useFor);

//   const updateRow = (rowId, next) => {
//     setRows((prev) => prev.map((r) => (r.id === rowId ? next : r)));
//   };

//   const removeRow = (rowId) => {
//     setRows((prev) => prev.filter((r) => r.id !== rowId));
//   };

//   const addRow = () => setRows((prev) => [...prev, makeRow()]);

//   const handleSubmit = async () => {
//     setLocalError(null);

//     if (!assemblyaiKey.trim()) {
//       setLocalError('An AssemblyAI key is required.');
//       return;
//     }
//     if (!termsAccepted) {
//       setLocalError('You must accept the terms to continue.');
//       return;
//     }

//     const validRows = rows.filter((r) => r.key.trim() && r.useFor.length > 0);
//     if (validRows.length === 0) {
//       setLocalError('Add at least one provider with a key and at least one mode selected.');
//       return;
//     }

//     const payload = {
//       assemblyaiKey: assemblyaiKey.trim(),
//       providers: validRows.map((r) => ({ name: r.name, key: r.key.trim(), useFor: r.useFor })),
//       termsAccepted: true,
//     };

//     const ok = await activateL1(payload);
//     if (ok) onActivated?.();
//   };

//   return (
//     <div className="plan-screen">
//       <div className="plan-screen__header">
//         <h2>Set up your own AI keys</h2>
//         <p className="plan-screen__subtitle">
//           Bring your own API keys — you're billed directly by each provider, not by
//           us. An AssemblyAI key is required for voice transcription; add at least
//           one AI provider below for whichever mode(s) you want to use.
//         </p>
//       </div>

//       {(localError || error) && <div className="banner banner--error">{localError || error}</div>}

//       <div className="plan-form">
//         <label className="plan-form__label">AssemblyAI API key (required)</label>
//         <input
//           className="plan-form__input"
//           type="password"
//           placeholder="Your AssemblyAI key"
//           value={assemblyaiKey}
//           onChange={(e) => setAssemblyaiKey(e.target.value)}
//         />

//         <div className="plan-form__providers">
//           <label className="plan-form__label">AI providers</label>
//           {rows.map((row) => (
//             <ProviderKeyRow
//               key={row.id}
//               row={row}
//               onChange={(next) => updateRow(row.id, next)}
//               onRemove={() => removeRow(row.id)}
//               disabledModes={claimedModesExcept(row.id)}
//             />
//           ))}
//           <button type="button" className="link-btn" onClick={addRow}>
//             + Add another provider
//           </button>
//         </div>

//         <label className="plan-form__checkbox">
//           <input
//             type="checkbox"
//             checked={termsAccepted}
//             onChange={(e) => setTermsAccepted(e.target.checked)}
//           />
//           I accept the terms — my keys are encrypted and used only to make requests
//           on my behalf, and I understand my usage is billed directly by each provider.
//         </label>

//         <button className="respond-btn" onClick={handleSubmit} disabled={isSubmitting}>
//           {isSubmitting && <span className="respond-btn__spinner" aria-hidden="true" />}
//           {isSubmitting ? 'Activating…' : 'Activate Plan'}
//         </button>
//       </div>
//     </div>
//   );
// }

// ################################################################################
// ################################################################################
// ################################################################################

/**
 * FILE: frontend/src/components/plan/PlanActivation.jsx
 * PURPOSE: Screen shown when a logged-in user has no active plan — the
 * real UI replacement for what we were testing via Postman. Collects an
 * AssemblyAI key (required) + at least one AI provider (Groq/Gemini/
 * Mistral) tagged with which mode(s) it powers, plus terms acceptance,
 * then calls the SAME /api/plan/activate-l1 endpoint we already proved
 * works.
 *
 * Receives activateL1/isSubmitting/error as PROPS from a single
 * App.jsx-level usePlan() instance — does not call usePlan() itself, to
 * avoid two independent fetches of the same plan state.
 */

import { useState } from 'react';
import ProviderKeyRow from './ProviderKeyRow';

function makeRow() {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: 'groq',
    key: '',
    useFor: [],
  };
}

export default function PlanActivation({ activateL1, isSubmitting, error, onActivated,providerCapabilities }) {
  const [assemblyaiKey, setAssemblyaiKey] = useState('');
  const [rows, setRows] = useState([makeRow()]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localError, setLocalError] = useState(null);

  const claimedModesExcept = (rowId) =>
    rows.filter((r) => r.id !== rowId).flatMap((r) => r.useFor);

  const totalModesClaimed = rows.flatMap((r) => r.useFor).length;
  const allModesAssigned = totalModesClaimed >= 3; // voice + text + screenshot

  const updateRow = (rowId, next) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? next : r)));
  };

  const removeRow = (rowId) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const addRow = () => setRows((prev) => [...prev, makeRow()]);

  const handleSubmit = async () => {
    setLocalError(null);

    if (!assemblyaiKey.trim()) {
      setLocalError('An AssemblyAI key is required.');
      return;
    }
    if (!termsAccepted) {
      setLocalError('You must accept the terms to continue.');
      return;
    }

    const validRows = rows.filter((r) => r.key.trim() && r.useFor.length > 0);
    if (validRows.length === 0) {
      setLocalError('Add at least one provider with a key and at least one mode selected.');
      return;
    }

    const payload = {
      assemblyaiKey: assemblyaiKey.trim(),
      providers: validRows.map((r) => ({ name: r.name, key: r.key.trim(), useFor: r.useFor })),
      termsAccepted: true,
    };

    const ok = await activateL1(payload);
    if (ok) onActivated?.();
  };

  return (
    <div className="plan-screen">
      <div className="plan-screen__header">
        <h2>Set up your own AI keys</h2>
        <p className="plan-screen__subtitle">
          Bring your own API keys — you're billed directly by each provider, not by
          us. An AssemblyAI key is required for voice transcription; add at least
          one AI provider below for whichever mode(s) you want to use.
        </p>
      </div>

      {(localError || error) && <div className="banner banner--error">{localError || error}</div>}

      <div className="plan-form">
        <label className="plan-form__label">AssemblyAI API key (required)</label>
        <input
          className="plan-form__input"
          type="password"
          placeholder="Your AssemblyAI key"
          value={assemblyaiKey}
          onChange={(e) => setAssemblyaiKey(e.target.value)}
        />

        <div className="plan-form__providers">
          <label className="plan-form__label">AI providers</label>
          {rows.map((row) => (
            <ProviderKeyRow
              key={row.id}
              row={row}
              onChange={(next) => updateRow(row.id, next)}
              onRemove={() => removeRow(row.id)}
              disabledModes={claimedModesExcept(row.id)}
              providerCapabilities={providerCapabilities} 
            />
          ))}
          <button
            type="button"
            className="link-btn"
            onClick={addRow}
            disabled={allModesAssigned}
          >
            + Add another provider
          </button>
          {allModesAssigned && (
            <p className="plan-form__hint">
              All modes (Voice, Chat, Screenshot) already have a provider assigned.
            </p>
          )}
        </div>

        <label className="plan-form__checkbox">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          I accept the terms — my keys are encrypted and used only to make requests
          on my behalf, and I understand my usage is billed directly by each provider.
        </label>

        <button className="respond-btn" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <span className="respond-btn__spinner" aria-hidden="true" />}
          {isSubmitting ? 'Activating…' : 'Activate Plan'}
        </button>
      </div>
    </div>
  );
} 