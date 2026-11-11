import React from 'react';
import { GROUP_LABELS, RECIPIENT_GROUPS } from '../../portal/emailRecipients';

export default function RecipientFilters({
  counts = {},
  selectedGroup = '',
  onChange,
  disabled = false,
}) {
  const selected = RECIPIENT_GROUPS.find(
    (group) => group.key === selectedGroup,
  );

  return (
    <div className="portal-messages__filters">
      <label htmlFor="message-recipient-group">
        Who should get this email?
        <select
          id="message-recipient-group"
          value={selectedGroup}
          disabled={disabled}
          aria-describedby="message-recipient-hint"
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose a group</option>
          {RECIPIENT_GROUPS.map((group) => (
            <option key={group.key} value={group.key}>
              {`${group.label} (${counts[group.key] || 0})`}
            </option>
          ))}
        </select>
      </label>
      <p id="message-recipient-hint" className="portal-messages__hint">
        {selected ? selected.hint : 'Pick who this email is for.'}
      </p>
      {selected?.alsoCountedIn && (
        <p className="portal-messages__hint">
          {`These people are counted under ${
            GROUP_LABELS[selected.alsoCountedIn]
          } as well, so the counts above overlap.`}
        </p>
      )}
    </div>
  );
}
