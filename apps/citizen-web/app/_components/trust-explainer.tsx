import { CivicIcon } from './icons';

export function TrustExplainer() {
  return (
    <aside aria-labelledby="trust-explainer-title" className="trust-explainer">
      <div className="trust-explainer-icon">
        <CivicIcon aria-hidden="true" name="shield" />
      </div>
      <div>
        <p className="eyebrow">Know what you are seeing</p>
        <h2 id="trust-explainer-title">Community signal, official workflow</h2>
        <p>
          Public cards contain only reviewed summaries and approximate locations. Official status
          updates are kept separate from community support, and your private complaint evidence is
          never exposed here.
        </p>
      </div>
    </aside>
  );
}
