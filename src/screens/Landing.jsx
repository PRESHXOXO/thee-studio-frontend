import React from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '✦',
    title: 'Creator Identity',
    desc: 'Save private creator references once and reuse them across supported identity-aware generation workflows.',
  },
  {
    icon: '◈',
    title: 'Reference Sets',
    desc: 'Build multi-angle reference photography from a saved creator so future shoots have stronger visual context.',
  },
  {
    icon: '◇',
    title: 'New Creator',
    desc: 'Create a reusable visual profile with private headshot and full-body references that survive refresh and device changes.',
  },
  {
    icon: '◉',
    title: 'Thee Director',
    desc: 'Direct a shoot from a guided setup, a freeform description, or a creative conversation with role-aware references.',
  },
  {
    icon: '⬡',
    title: 'Campaigns',
    desc: 'Plan multi-shot creative and generate stills from the campaign workspace using the campaign creator context.',
  },
  {
    icon: '◎',
    title: 'Private Library',
    desc: 'Keep generated work, creator references, and project history organized inside your account.',
  },
];

const PRO_FEATURES = [
  '1,000 generation credits each month',
  'Thee Studio workspace',
  'Creator references, Director, Campaigns & Library',
];

function BrandMark({ small = false }) {
  const size = small ? 32 : 56;
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: small ? 9 : 16,
      background: 'var(--grad-plum)',
      display: 'grid',
      placeItems: 'center',
      boxShadow: small ? 'none' : 'var(--shadow-md)',
      flexShrink: 0,
    }}>
      <span style={{
        font: `${small ? '700 0.875rem/1' : '700 1.5rem/1'} var(--font-display)`,
        color: 'var(--champagne)',
      }}>T</span>
    </div>
  );
}

function HeroSection({ onCTA }) {
  return (
    <section className="ts-landing-hero">
      <div className="ts-orb ts-orb-a" aria-hidden />
      <div className="ts-orb ts-orb-b" aria-hidden />
      <BrandMark />
      <div className="ts-eyebrow">Introducing Thee Studio</div>
      <h1>Your AI-powered<br />creative studio</h1>
      <p className="ts-hero-copy">
        Build reusable AI creators, direct image shoots, and organize campaign work from one private creative workspace.
      </p>
      <div className="ts-hero-actions">
        <button className="ts-primary-cta" onClick={onCTA}>View Studio Pro</button>
        <a className="ts-secondary-cta" href="#features">See how it works</a>
      </div>

      <div className="ts-mockup" aria-label="Thee Studio interface preview">
        <aside className="ts-mock-sidebar">
          <div className="ts-mock-brand"><BrandMark small /><span>Thee Studio</span></div>
          {['Studio', 'Cast', 'New Creator', 'Thee Director', 'Scenes'].map((item, index) => (
            <div key={item} className={index === 0 ? 'ts-mock-nav active' : 'ts-mock-nav'}>{item}</div>
          ))}
        </aside>
        <div className="ts-mock-main">
          <div className="ts-mock-title">Studio</div>
          <div className="ts-mock-actions">
            {['Build a Creator', 'Direct a Shoot', 'Plan a Campaign'].map(label => (
              <div key={label} className="ts-mock-card">
                <div className="ts-mock-icon" />
                <strong>{label}</strong>
              </div>
            ))}
          </div>
          <div className="ts-mock-gallery">
            {[1, 2, 3, 4].map(index => <div key={index} className="ts-mock-image" style={{ opacity: 0.52 + index * 0.1 }} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="ts-section ts-features-section">
      <div className="ts-section-inner">
        <div className="ts-section-heading">
          <div className="ts-eyebrow">Creative workflow</div>
          <h2>Build once.<br />Keep creating.</h2>
          <p>Creator identity, direction, generation, and organization live in one connected studio.</p>
        </div>
        <div className="ts-feature-grid">
          {FEATURES.map(feature => (
            <article key={feature.title} className="ts-feature-card">
              <div className="ts-feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ name, price, detail, features, accent, onCTA, buttonLabel }) {
  return (
    <article className={accent ? 'ts-plan-card ts-plan-card-accent' : 'ts-plan-card'}>
      <div className="ts-plan-name">{name}</div>
      <div className="ts-plan-price">{price}</div>
      <div className="ts-plan-detail">{detail}</div>
      <div className="ts-plan-features">
        {features.map(feature => (
          <div key={feature} className="ts-plan-feature"><span>✓</span>{feature}</div>
        ))}
      </div>
      <button className={accent ? 'ts-primary-cta ts-plan-button' : 'ts-secondary-cta ts-plan-button'} onClick={onCTA}>
        {buttonLabel}
      </button>
    </article>
  );
}

function PricingSection({ onCTA }) {
  return (
    <section id="pricing" className="ts-section ts-pricing-section">
      <div className="ts-pricing-inner">
        <div className="ts-section-heading">
          <div className="ts-eyebrow">Pricing</div>
          <h2>One plan.<br />Full Studio access.</h2>
          <p>Studio Pro is $19 per month with 1,000 Studio credits included each month. No public free tier.</p>
        </div>
        <div className="ts-plan-grid">
          <PlanCard
            name="Studio Pro"
            price="$19"
            detail="per month · 1,000 generation credits"
            features={PRO_FEATURES}
            accent
            onCTA={onCTA}
            buttonLabel="Subscribe to Studio Pro"
          />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="ts-landing-footer">
      <div className="ts-footer-brand"><BrandMark small /><span>Thee Studio</span></div>
      <p>© {new Date().getFullYear()} Thee Studio. All rights reserved.</p>
    </footer>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const goToPlans = () => navigate('/plans');
  const goToLogin = () => navigate('/login');

  return (
    <div className="ts-landing-root">
      <style>{`
        .ts-landing-root { font-family: var(--font-ui); background: var(--cream); color: var(--text-body); }
        .ts-landing-nav { position: fixed; inset: 0 0 auto; z-index: 100; height: 64px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,247,242,.88); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
        .ts-landing-brand, .ts-footer-brand, .ts-mock-brand { display: flex; align-items: center; gap: 10px; font: 600 1rem/1 var(--font-display); color: var(--text-strong); }
        .ts-landing-nav-links { display: flex; gap: 12px; align-items: center; }
        .ts-landing-nav a, .ts-nav-button { font: var(--text-sm); color: var(--text-muted); text-decoration: none; font-weight: 500; border: 0; background: none; cursor: pointer; }
        .ts-nav-start { background: var(--grad-coral); color: #fff; border: 0; border-radius: var(--radius-md); padding: 9px 18px; font: 600 .875rem/1 var(--font-ui); cursor: pointer; }
        .ts-landing-body { padding-top: 64px; }
        .ts-landing-hero { min-height: calc(100vh - 64px); padding: 80px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; overflow: hidden; }
        .ts-orb { position: absolute; border-radius: 50%; pointer-events: none; }
        .ts-orb-a { width: 480px; height: 480px; top: -120px; right: -120px; background: radial-gradient(circle, rgba(255,107,74,.12) 0%, transparent 70%); }
        .ts-orb-b { width: 360px; height: 360px; bottom: -80px; left: -80px; background: radial-gradient(circle, rgba(217,30,70,.08) 0%, transparent 70%); }
        .ts-eyebrow { margin-top: 24px; margin-bottom: 18px; font: 600 .75rem/1 var(--font-ui); letter-spacing: .14em; color: var(--coral); text-transform: uppercase; }
        .ts-landing-hero h1, .ts-section-heading h2 { margin: 0; color: var(--text-strong); letter-spacing: -.02em; }
        .ts-landing-hero h1 { max-width: 820px; font: 600 clamp(2.55rem, 6vw, 4.25rem)/1.02 var(--font-display); }
        .ts-hero-copy { max-width: 590px; margin: 24px auto 42px; font: var(--text-lg); line-height: 1.65; color: var(--text-muted); }
        .ts-hero-actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
        .ts-primary-cta, .ts-secondary-cta { min-height: 46px; padding: 0 28px; border-radius: var(--radius-md); display: inline-flex; align-items: center; justify-content: center; font: 600 .95rem/1 var(--font-ui); text-decoration: none; cursor: pointer; box-sizing: border-box; }
        .ts-primary-cta { border: 0; background: var(--grad-coral); color: #fff; box-shadow: var(--shadow-coral); }
        .ts-secondary-cta { border: 1px solid var(--border); background: var(--white); color: var(--text-body); box-shadow: none; }
        .ts-mockup { margin-top: 64px; width: min(900px, 100%); aspect-ratio: 16/9; display: flex; overflow: hidden; border-radius: var(--radius-xl); border: 1px solid var(--border); background: var(--white); box-shadow: var(--shadow-lg); text-align: left; }
        .ts-mock-sidebar { width: 180px; padding: 20px 12px; border-right: 1px solid var(--border); flex-shrink: 0; box-sizing: border-box; }
        .ts-mock-brand { margin-bottom: 24px; font-size: .8125rem; }
        .ts-mock-nav { padding: 8px 10px; margin-bottom: 2px; border-radius: 8px; font: 400 .75rem/1 var(--font-ui); color: var(--text-muted); }
        .ts-mock-nav.active { background: var(--rose-glass); color: var(--coral); font-weight: 600; }
        .ts-mock-main { flex: 1; min-width: 0; padding: 24px; background: var(--cream); }
        .ts-mock-title { margin-bottom: 16px; font: 600 1.25rem/1 var(--font-display); color: var(--text-strong); }
        .ts-mock-actions { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
        .ts-mock-card { min-width: 0; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--white); box-shadow: var(--shadow-xs); font-size: .75rem; }
        .ts-mock-icon { width: 28px; height: 28px; margin-bottom: 10px; border-radius: 8px; background: var(--rose-glass); }
        .ts-mock-gallery { margin-top: 16px; display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
        .ts-mock-image { aspect-ratio: 3/4; border-radius: 10px; background: var(--grad-portrait); }
        .ts-section { padding: 100px 24px; }
        .ts-features-section { background: var(--white); }
        .ts-pricing-section { background: var(--cream); }
        .ts-section-inner { max-width: 1100px; margin: 0 auto; }
        .ts-pricing-inner { max-width: 860px; margin: 0 auto; }
        .ts-section-heading { max-width: 620px; margin: 0 auto 58px; text-align: center; }
        .ts-section-heading .ts-eyebrow { margin-top: 0; }
        .ts-section-heading h2 { font: 600 clamp(2.3rem, 5vw, 3rem)/1.06 var(--font-display); }
        .ts-section-heading p { margin: 18px auto 0; max-width: 540px; color: var(--text-muted); font: var(--text-lg); line-height: 1.6; }
        .ts-feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 24px; }
        .ts-feature-card { padding: 30px; border: 1px solid var(--border); border-radius: var(--radius-xl); background: var(--cream); }
        .ts-feature-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: var(--radius-md); border: 1px solid var(--blush); background: var(--rose-glass); color: var(--coral); font-size: 1.2rem; }
        .ts-feature-card h3 { margin: 20px 0 9px; font: 600 1.125rem/1.2 var(--font-display); color: var(--text-strong); }
        .ts-feature-card p { margin: 0; font: var(--text-base); line-height: 1.6; color: var(--text-muted); }
        .ts-plan-grid { display: grid; grid-template-columns: minmax(0, 520px); justify-content: center; gap: 24px; }
        .ts-plan-card { padding: 34px 30px; border: 1px solid var(--border); border-radius: var(--radius-xl); background: var(--white); text-align: left; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; }
        .ts-plan-card-accent { background: var(--plum); border-color: transparent; color: #fff; box-shadow: var(--shadow-coral); }
        .ts-plan-name { font: 600 .75rem/1 var(--font-ui); letter-spacing: .13em; text-transform: uppercase; color: var(--text-muted); }
        .ts-plan-card-accent .ts-plan-name { color: var(--champagne); }
        .ts-plan-price { margin: 14px 0 6px; font: 600 3rem/1 var(--font-display); color: var(--text-strong); }
        .ts-plan-card-accent .ts-plan-price { color: #fff; }
        .ts-plan-detail { min-height: 38px; color: var(--text-muted); font: var(--text-sm); }
        .ts-plan-card-accent .ts-plan-detail { color: rgba(255,255,255,.58); }
        .ts-plan-features { display: flex; flex-direction: column; gap: 12px; margin: 26px 0 30px; flex: 1; }
        .ts-plan-feature { display: flex; gap: 10px; align-items: flex-start; font: var(--text-base); color: var(--text-body); line-height: 1.4; }
        .ts-plan-feature span { color: var(--status-ready); font-weight: 700; }
        .ts-plan-card-accent .ts-plan-feature { color: rgba(255,255,255,.86); }
        .ts-plan-card-accent .ts-plan-feature span { color: var(--champagne); }
        .ts-plan-button { width: 100%; }
        .ts-landing-footer { padding: 52px 24px; background: var(--plum); text-align: center; }
        .ts-footer-brand { justify-content: center; color: var(--text-on-dark); }
        .ts-landing-footer p { margin: 16px 0 0; font: var(--text-sm); color: rgba(255,255,255,.38); }
        @media (max-width: 820px) {
          .ts-feature-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .ts-mock-sidebar { width: 150px; }
        }
        @media (max-width: 640px) {
          .ts-landing-nav { height: 58px; padding: 0 16px; }
          .ts-landing-body { padding-top: 58px; }
          .ts-landing-nav-links > a { display: none; }
          .ts-nav-button { padding: 10px 4px; }
          .ts-nav-start { padding: 9px 12px; }
          .ts-landing-hero { min-height: auto; padding: 62px 18px 56px; }
          .ts-hero-copy { margin-bottom: 32px; font-size: 1rem; }
          .ts-hero-actions { width: 100%; }
          .ts-primary-cta, .ts-secondary-cta { min-height: 48px; }
          .ts-hero-actions .ts-primary-cta, .ts-hero-actions .ts-secondary-cta { flex: 1 1 150px; }
          .ts-mockup { margin-top: 48px; aspect-ratio: auto; min-height: 330px; }
          .ts-mock-sidebar { display: none; }
          .ts-mock-main { padding: 18px; }
          .ts-mock-actions { grid-template-columns: 1fr; }
          .ts-mock-gallery { grid-template-columns: repeat(3, minmax(0,1fr)); }
          .ts-mock-gallery .ts-mock-image:last-child { display: none; }
          .ts-section { padding: 72px 18px; }
          .ts-section-heading { margin-bottom: 38px; }
          .ts-section-heading p { font-size: 1rem; }
          .ts-feature-grid, .ts-plan-grid { grid-template-columns: 1fr; gap: 16px; }
          .ts-feature-card, .ts-plan-card { padding: 24px; }
        }
      `}</style>

      <nav className="ts-landing-nav">
        <div className="ts-landing-brand"><BrandMark small /><span>Thee Studio</span></div>
        <div className="ts-landing-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <button className="ts-nav-button" onClick={goToLogin}>Log in</button>
          <button className="ts-nav-start" onClick={goToPlans}>View plans</button>
        </div>
      </nav>

      <div className="ts-landing-body">
        <HeroSection onCTA={goToPlans} />
        <FeaturesSection />
        <PricingSection onCTA={goToPlans} />
        <Footer />
      </div>
    </div>
  );
}
