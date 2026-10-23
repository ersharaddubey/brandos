// /**
//  * FILE: frontend/src/components/plan/PlanSettings.jsx
//  * PURPOSE: Shown once a plan is active — lets the user see and change
//  * which of their already-configured providers powers each mode, without
//  * re-entering any secrets (calls PATCH /api/plan/providers, which only
//  * reassigns among keys already stored — see plan.routes.js).
//  *
//  * Reuses the same .log__source--{mode} color-coded badges from the main
//  * assistant feed (voice/text/screenshot color coding), for visual
//  * consistency rather than inventing new colors here.
//  *
//  * PHASE 6 CHANGE: each mode's dropdown now only lists providers that are
//  * BOTH configured (has a stored key) AND capable of that mode (per
//  * providerCapabilities from the registry) — previously it only checked
//  * "configured", so a text-only provider could still be shown/selected
//  * for screenshot mode.
//  */

// import { useState } from 'react';

// const MODE_LABELS = { voice: 'Voice', text: 'Chat', screenshot: 'Screenshot' };

// export default function PlanSettings({
//   providerPreferences,
//   configuredProviders,
//   providerCapabilities = {},
//   onReassign,
//   error,
// }) {
//   const [savingMode, setSavingMode] = useState(null);

//   const handleChange = async (mode, provider) => {
//     setSavingMode(mode);
//     await onReassign(mode, provider);
//     setSavingMode(null);
//   };

//   const availableProviders = configuredProviders.filter((p) => p !== 'assemblyai');

//   return (
//     <div className="plan-screen">
//       <div className="plan-screen__header">
//         <h2>Plan settings</h2>
//         <p className="plan-screen__subtitle">
//           Choose which of your configured providers powers each mode. To add a
//           NEW provider you haven't entered a key for yet, reactivate your plan
//           with the additional provider included.
//         </p>
//       </div>

//       {error && <div className="banner banner--error">{error}</div>}

//       <div className="plan-settings__list">
//         {Object.entries(MODE_LABELS).map(([mode, label]) => {
//           const availableForMode = availableProviders.filter((p) =>
//             providerCapabilities[p]?.modes?.includes(mode)
//           );

//           return (
//             <div key={mode} className="plan-settings__row">
//               <span className={`log__source log__source--${mode}`}>{label}</span>
//               <select
//                 className="plan-form__input plan-settings__select"
//                 value={providerPreferences[mode] || ''}
//                 onChange={(e) => handleChange(mode, e.target.value)}
//                 disabled={savingMode === mode || availableForMode.length === 0}
//               >
//                 <option value="" disabled>
//                   {availableForMode.length === 0 ? 'No compatible provider configured' : 'Not configured'}
//                 </option>
//                 {availableForMode.map((p) => (
//                   <option key={p} value={p}>
//                     {p.charAt(0).toUpperCase() + p.slice(1)}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// ############################################################################
// ############################################################################
// ############################################################################

// import { useState } from 'react';
// import CustomSelect from '../common/CustomSelect';

// const MODE_LABELS = { voice: 'Voice', text: 'Chat', screenshot: 'Screenshot' };

// export default function PlanSettings({
//   providerPreferences,
//   configuredProviders,
//   providerCapabilities = {},
//   onReassign,
//   error,
// }) {
//   const [savingMode, setSavingMode] = useState(null);

//   const handleChange = async (mode, provider) => {
//     setSavingMode(mode);
//     await onReassign(mode, provider);
//     setSavingMode(null);
//   };

//   const availableProviders = configuredProviders.filter((p) => p !== 'assemblyai');

//   return (
//     <div className="plan-screen">
//       <div className="plan-screen__header">
//         <h2>Plan settings</h2>
//         <p className="plan-screen__subtitle">
//           Choose which of your configured providers powers each mode. To add a
//           NEW provider you haven't entered a key for yet, reactivate your plan
//           with the additional provider included.
//         </p>
//       </div>

//       {error && <div className="banner banner--error">{error}</div>}

//       <div className="plan-settings__list">
//         {Object.entries(MODE_LABELS).map(([mode, label]) => {
//           const availableForMode = availableProviders.filter((p) =>
//             providerCapabilities[p]?.modes?.includes(mode)
//           );

//           const options = availableForMode.map((p) => ({
//             value: p,
//             label: p.charAt(0).toUpperCase() + p.slice(1),
//           }));

//           return (
//             <div key={mode} className="plan-settings__row">
//               <span className={`log__source log__source--${mode}`}>{label}</span>
//               <CustomSelect
//                 className="plan-settings__select"
//                 value={providerPreferences[mode] || ''}
//                 onChange={(val) => handleChange(mode, val)}
//                 options={options}
//                 placeholder={
//                   availableForMode.length === 0 ? 'No compatible provider configured' : 'Not configured'
//                 }
//                 disabled={savingMode === mode || availableForMode.length === 0}
//               />
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }


// ###########################################################################
// ###########################################################################
// ###########################################################################

import { useState } from 'react';
import CustomSelect from '../common/CustomSelect';

const MODE_LABELS = { voice: 'Voice', text: 'Chat', screenshot: 'Screenshot' };

export default function PlanSettings({
  providerPreferences,
  configuredProviders,
  providerCapabilities = {},
  onReassign,
  onUpdateKey,       // NEW prop — pass plan.updateProviderKey from App.jsx
  isUpdatingKey,     // NEW prop — pass plan.isUpdatingKey from App.jsx
  error,
}) {
  const [savingMode, setSavingMode] = useState(null);
  const [keyDrafts, setKeyDrafts] = useState({});   // { providerName: 'typed value' }
  const [savedProvider, setSavedProvider] = useState(null); // brief success flash

  const handleChange = async (mode, provider) => {
    setSavingMode(mode);
    await onReassign(mode, provider);
    setSavingMode(null);
  };

  const handleKeyDraftChange = (provider, value) => {
    setKeyDrafts((prev) => ({ ...prev, [provider]: value }));
  };

  const handleKeySave = async (provider) => {
    const newKey = (keyDrafts[provider] || '').trim();
    if (!newKey) return;

    const ok = await onUpdateKey(provider, newKey);
    if (ok) {
      setKeyDrafts((prev) => ({ ...prev, [provider]: '' }));
      setSavedProvider(provider);
      setTimeout(() => setSavedProvider(null), 3000);
    }
  };

  const availableProviders = configuredProviders.filter((p) => p !== 'assemblyai');

  return (
    <div className="plan-screen">
      <div className="plan-screen__header">
        <h2>Plan settings</h2>
        <p className="plan-screen__subtitle">
          Choose which of your configured providers powers each mode, or update
          a provider's key below (e.g. if it was rotated or expired). To add a
          NEW provider you haven't entered a key for yet, reactivate your plan
          with the additional provider included.
        </p>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      <div className="plan-settings__list">
        {Object.entries(MODE_LABELS).map(([mode, label]) => {
          const availableForMode = availableProviders.filter((p) =>
            providerCapabilities[p]?.modes?.includes(mode)
          );

          const options = availableForMode.map((p) => ({
            value: p,
            label: p.charAt(0).toUpperCase() + p.slice(1),
          }));

          return (
            <div key={mode} className="plan-settings__row">
              <span className={`log__source log__source--${mode}`}>{label}</span>
              <CustomSelect
                className="plan-settings__select"
                value={providerPreferences[mode] || ''}
                onChange={(val) => handleChange(mode, val)}
                options={options}
                placeholder={
                  availableForMode.length === 0 ? 'No compatible provider configured' : 'Not configured'
                }
                disabled={savingMode === mode || availableForMode.length === 0}
              />
            </div>
          );
        })}
      </div>

      {/* NEW — key update section, one row per configured provider */}
      <div className="plan-settings__keys">
        <label className="plan-form__label">Update provider keys</label>
        {availableProviders.length === 0 && (
          <p className="plan-form__hint">No providers configured yet.</p>
        )}
        {availableProviders.map((provider) => (
          <div key={provider} className="plan-settings__key-row">
            <span className="plan-settings__key-label">
              {provider.charAt(0).toUpperCase() + provider.slice(1)}
            </span>
            <input
              className="plan-form__input"
              type="password"
              placeholder={`New ${provider} key`}
              value={keyDrafts[provider] || ''}
              onChange={(e) => handleKeyDraftChange(provider, e.target.value)}
            />
            <button
              type="button"
              className="respond-btn plan-settings__key-save"
              onClick={() => handleKeySave(provider)}
              disabled={isUpdatingKey || !(keyDrafts[provider] || '').trim()}
            >
              {isUpdatingKey ? 'Saving…' : 'Update'}
            </button>
            {savedProvider === provider && (
              <span className="banner banner--success plan-settings__key-saved">Key updated</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
