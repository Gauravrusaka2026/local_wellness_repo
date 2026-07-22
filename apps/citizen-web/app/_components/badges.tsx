import { CivicIcon } from './icons';

export function ConfidenceBadge({
  confidence,
}: Readonly<{ confidence: 'high' | 'low' | 'medium' }>) {
  return (
    <span className={`signal-badge confidence-${confidence}`}>
      <CivicIcon aria-hidden="true" name="spark" />
      {confidence.charAt(0).toUpperCase() + confidence.slice(1)} route confidence
    </span>
  );
}

export function ProvenanceBadge({
  provenance,
}: Readonly<{
  provenance:
    | 'citizen_reported'
    | 'community_corroborated'
    | 'department_updated'
    | 'officially_acknowledged';
}>) {
  const labels = {
    citizen_reported: 'Citizen reported',
    community_corroborated: 'Community corroborated',
    department_updated: 'Department updated',
    officially_acknowledged: 'Officially acknowledged',
  } as const;

  return (
    <span className={`signal-badge provenance-${provenance}`}>
      <CivicIcon
        aria-hidden="true"
        name={provenance === 'citizen_reported' ? 'account' : 'shield'}
      />
      {labels[provenance]}
    </span>
  );
}
