import Link from 'next/link';

import { HomeNearbyReports } from './_components/home-nearby';
import { CivicIcon } from './_components/icons';
import { TrustExplainer } from './_components/trust-explainer';

export default function Page() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="hero-kicker">
            <CivicIcon aria-hidden="true" name="spark" /> Maharashtra civic access
          </span>
          <h1>Spot it. Report it. See what happens next.</h1>
          <p>
            JagrukSetu routes verified, location-based reports through Local Wellness so you do not
            need to know the ward, department or officer first.
          </p>
          <div className="hero-actions">
            <Link className="primary-link hero-primary" href="/report">
              <CivicIcon aria-hidden="true" name="camera" /> Report a civic issue
            </Link>
            <Link className="secondary-link" href="/transparency">
              <CivicIcon aria-hidden="true" name="map" /> Explore nearby
            </Link>
          </div>
          <div className="hero-assurance">
            <span>
              <CivicIcon aria-hidden="true" name="shield" /> Private evidence
            </span>
            <span>
              <CivicIcon aria-hidden="true" name="location" /> Location-aware routing
            </span>
            <span>
              <CivicIcon aria-hidden="true" name="timeline" /> Visible status history
            </span>
          </div>
        </div>
        <div aria-label="How reporting works" className="hero-workflow-card">
          <div className="workflow-card-topline">
            <span>Fast civic reporting</span>
            <span className="live-dot">Private by default</span>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Add evidence</strong>
                <small>Capture the issue while nearby</small>
              </div>
              <CivicIcon aria-hidden="true" name="camera" />
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Verify location</strong>
                <small>Resolve ward and governing body</small>
              </div>
              <CivicIcon aria-hidden="true" name="location" />
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Follow action</strong>
                <small>Track official updates and resolution</small>
              </div>
              <CivicIcon aria-hidden="true" name="timeline" />
            </li>
          </ol>
          <Link href="/complaints">
            Track your reports <CivicIcon aria-hidden="true" name="arrow" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="quick-actions-heading" className="home-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Start here</p>
            <h2 id="quick-actions-heading">What do you need today?</h2>
          </div>
        </div>
        <div className="quick-action-grid">
          <Link className="quick-action-card is-orange" href="/report">
            <span className="feature-icon">
              <CivicIcon aria-hidden="true" name="camera" />
            </span>
            <strong>Report an issue</strong>
            <p>Use live evidence and location in the mobile app.</p>
            <span className="card-arrow">
              <CivicIcon aria-hidden="true" name="arrow" />
            </span>
          </Link>
          <Link className="quick-action-card is-blue" href="/transparency">
            <span className="feature-icon">
              <CivicIcon aria-hidden="true" name="map" />
            </span>
            <strong>Browse nearby</strong>
            <p>Find reviewed reports and avoid duplicates.</p>
            <span className="card-arrow">
              <CivicIcon aria-hidden="true" name="arrow" />
            </span>
          </Link>
          <Link className="quick-action-card is-green" href="/complaints">
            <span className="feature-icon">
              <CivicIcon aria-hidden="true" name="timeline" />
            </span>
            <strong>Track progress</strong>
            <p>See official updates, feedback and resolution.</p>
            <span className="card-arrow">
              <CivicIcon aria-hidden="true" name="arrow" />
            </span>
          </Link>
          <Link className="quick-action-card is-purple" href="/directory">
            <span className="feature-icon">
              <CivicIcon aria-hidden="true" name="building" />
            </span>
            <strong>Find your authority</strong>
            <p>Resolve verified governing bodies from location.</p>
            <span className="card-arrow">
              <CivicIcon aria-hidden="true" name="arrow" />
            </span>
          </Link>
        </div>
      </section>

      <HomeNearbyReports />
      <TrustExplainer />

      <section className="mobile-handoff-banner">
        <div className="feature-icon is-orange">
          <CivicIcon aria-hidden="true" name="camera" />
        </div>
        <div>
          <p className="eyebrow">Evidence-led reporting</p>
          <h2>Use the mobile app when you are at the issue</h2>
          <p>Camera, media permissions and proximity checks protect the quality of the report.</p>
        </div>
        <Link className="primary-link" href="/report">
          Continue to report
        </Link>
      </section>

      <p className="emergency-note home-emergency">
        <strong>Immediate danger?</strong> JagrukSetu is not an emergency service. Call 112.
      </p>
    </main>
  );
}
