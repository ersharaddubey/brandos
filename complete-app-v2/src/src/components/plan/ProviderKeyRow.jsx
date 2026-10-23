// /**
//  * FILE: frontend/src/components/plan/ProviderKeyRow.jsx
//  * PURPOSE: One row in the L1 activation form — pick a provider, paste a
//  * key, check which mode(s) it powers. Reusable/repeatable — the user
//  * adds one of these per AI provider they want to bring their own key
//  * for (at least one required, up to three: Groq/Gemini/Mistral).
//  *
//  * disabledModes: modes already claimed by ANOTHER row in the form — each
//  * mode can only be assigned to exactly one provider, so its checkbox
//  * gets disabled here to prevent an invalid double-assignment before it
//  * ever reaches the server (which would also reject it, but catching it
//  * in the UI is a better experience than a round-trip error).
//  */

// // const PROVIDERS = ['groq', 'gemini', 'mistral'];
// const MODES = [
//   { id: 'voice', label: 'Voice' },
//   { id: 'text', label: 'Chat' },
//   { id: 'screenshot', label: 'Screenshot' },
// ];

// export default function ProviderKeyRow({ row, onChange, onRemove, disabledModes = [], providerCapabilities = {} }) {
//   const availableProviders = Object.keys(providerCapabilities); 
//   const toggleMode = (modeId) => {
//     const has = row.useFor.includes(modeId);
//     const next = has ? row.useFor.filter((m) => m !== modeId) : [...row.useFor, modeId];
//     onChange({ ...row, useFor: next });
//   };

//   return (
//     <div className="provider-row">
//       <div className="provider-row__top">
//         <select
//           className="plan-form__input provider-row__select"
//           value={row.name}
//           onChange={(e) => onChange({ ...row, name: e.target.value })}
//         >
//           {/* {PROVIDERS.map((p) => ( */}
//           {availableProviders.map((p) => (
//             <option key={p} value={p}>
//               {p.charAt(0).toUpperCase() + p.slice(1)}
//             </option>
//           ))}
//         </select>
//         <input
//           className="plan-form__input provider-row__key"
//           type="password"
//           placeholder={`Your ${row.name} API key`}
//           value={row.key}
//           onChange={(e) => onChange({ ...row, key: e.target.value })}
//         />
//         <button type="button" className="link-btn provider-row__remove" onClick={onRemove}>
//           Remove
//         </button>
//       </div>

//       <div className="provider-row__modes">
//         {MODES.map((m) => {
//           const notSupported = !providerCapabilities[row.name]?.modes?.includes(m.id);
//           const isDisabled = disabledModes.includes(m.id) || notSupported;
//           const isChecked = row.useFor.includes(m.id);
//           return (
//             <label
//               key={m.id}
//               className={`mode-chip ${isChecked ? 'mode-chip--active' : ''} ${
//                 isDisabled ? 'mode-chip--disabled' : ''
//               }`}
//             >
//               <input
//                 type="checkbox"
//                 checked={isChecked}
//                 disabled={isDisabled}
//                 onChange={() => toggleMode(m.id)}
//               />
//               {m.label}
//             </label>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// ##########################################################
// ##########################################################
// ##########################################################

import CustomSelect from '../common/CustomSelect';

const MODES = [
  { id: 'voice', label: 'Voice' },
  { id: 'text', label: 'Chat' },
  { id: 'screenshot', label: 'Screenshot' },
];

// Fallback when /api/plan has not returned capabilities yet (or failed).
// Without this, the provider dropdown is empty and every mode checkbox
// is disabled — so the user cannot enter any API key / mode at all.
const DEFAULT_CAPABILITIES = {
  groq: { modes: ['voice', 'text', 'screenshot'], label: 'Groq' },
  gemini: { modes: ['voice', 'text', 'screenshot'], label: 'Gemini' },
  mistral: { modes: ['voice', 'text', 'screenshot'], label: 'Mistral' },
  openai: { modes: ['voice', 'text', 'screenshot'], label: 'OpenAI' },
};

export default function ProviderKeyRow({ row, onChange, onRemove, disabledModes = [], providerCapabilities = {} }) {
  const caps =
    providerCapabilities && Object.keys(providerCapabilities).length > 0
      ? providerCapabilities
      : DEFAULT_CAPABILITIES;

  const availableProviders = Object.keys(caps);

  const providerOptions = availableProviders.map((p) => ({
    value: p,
    label: (caps[p]?.label) || (p.charAt(0).toUpperCase() + p.slice(1)),
  }));

  const toggleMode = (modeId) => {
    const has = row.useFor.includes(modeId);
    const next = has ? row.useFor.filter((m) => m !== modeId) : [...row.useFor, modeId];
    onChange({ ...row, useFor: next });
  };

  return (
    <div className="provider-row">
      <div className="provider-row__top">
        <CustomSelect
          className="provider-row__select"
          value={row.name}
          onChange={(val) => onChange({ ...row, name: val })}
          options={providerOptions}
        />
        <input
          className="plan-form__input provider-row__key"
          type="password"
          placeholder={`Your ${row.name} API key`}
          value={row.key}
          onChange={(e) => onChange({ ...row, key: e.target.value })}
        />
        <button type="button" className="link-btn provider-row__remove" onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className="provider-row__modes">
        {MODES.map((m) => {
          const notSupported = !caps[row.name]?.modes?.includes(m.id);
          const isDisabled = disabledModes.includes(m.id) || notSupported;
          const isChecked = row.useFor.includes(m.id);
          return (
            <label
              key={m.id}
              className={`mode-chip ${isChecked ? 'mode-chip--active' : ''} ${
                isDisabled ? 'mode-chip--disabled' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => toggleMode(m.id)}
              />
              {m.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}