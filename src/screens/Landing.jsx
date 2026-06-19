import React from 'react';
import { useNavigate } from 'react-router-dom';

function HeroSection({ onCTA }) {
  return (
    <section style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient orbs */}
      <div style={{
        position: 'absolute', top: -120, right: -120,
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,74,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80,
        width: 360, height: 360, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(217,30,70,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo mark */}
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'var(--grad-plum)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        boxShadow: 'var(--shadow-md)',
      }}>
        <span style={{ font: '700 1.5rem/1 var(--font-display)', color: 'var(--champagne)' }}>T</span>
      </div>

      <div style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '0.14em', color: 'var(--coral)', textTransform: 'uppercase', marginBottom: 20 }}>
        Introducing Thee Studio
      </div>

      <h1 style={{
        font: '600 clamp(2.5rem, 6vw, 4.25rem)/1.02 var(--font-display)',
        color: 'var(--text-strong)',
        maxWidth: 820,
        marginBottom: 24,
      }}>
        Your AI-powered<br />creative studio
      </h1>

      <p style={{
        font: 'var(--text-lg)',
        color: 'var(--text-muted)',
        maxWidth: 560,
        marginBottom: 48,
        lineHeight: 1.6,
      }}>
        Build consistent characters, generate on-brand content, and run full campaigns — all from one place built for creators.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onCTA} style={{
          background: 'var(--grad-coral)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '14px 32px',
          font: '600 1rem/1 var(--font-ui)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-coral)',
          transition: 'var(--t-base)',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Start for free
        </button>
        <a href="#features" style={{
          background: 'var(--white)',
          color: 'var(--text-body)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 32px',
          font: '600 1rem/1 var(--font-ui)',
          cursor: 'pointer',
          textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center',
          transition: 'var(--t-base)',
        }}>
          See how it works
        </a>
      </div>

      {/* Studio mockup preview */}
      <div style={{
        marginTop: 72,
        width: '100%',
        maxWidth: 900,
        background: 'var(--white)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        aspectRatio: '16/9',
        display: 'flex',
        alignItems: 'stretch',
      }}>
        {/* Mini sidebar */}
        <div style={{ width: 180, background: 'var(--white)', borderRight: '1px solid var(--border)', padding: '20px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--grad-plum)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ font: '700 0.75rem/1 var(--font-display)', color: 'var(--champagne)' }}>T</span>
            </div>
            <span style={{ font: '600 0.8125rem/1 var(--font-ui)', color: 'var(--text-strong)' }}>Thee Studio</span>
          </div>
          {['Studio', 'Image Generator', 'Thee Director', 'Characters', 'Scenes'].map((item, i) => (
            <div key={item} style={{
              padding: '7px 10px', borderRadius: 8, marginBottom: 2,
              background: i === 0 ? 'var(--rose-glass)' : 'transparent',
              font: `${i === 0 ? '600' : '400'} 0.75rem/1 var(--font-ui)`,
              color: i === 0 ? 'var(--coral)' : 'var(--text-muted)',
            }}>{item}</div>
          ))}
        </div>
        {/* Main content preview */}
        <div style={{ flex: 1, background: 'var(--cream)', padding: 24 }}>
          <div style={{ font: '600 1.25rem/1 var(--font-display)', color: 'var(--text-strong)', marginBottom: 16 }}>Studio</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {['Build a Character', 'Generate Images', 'Run a Campaign'].map(t => (
              <div key={t} style={{
                background: 'var(--white)', borderRadius: 12,
                border: '1px solid var(--border)',
                padding: '16px',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--rose-glass)', marginBottom: 10 }} />
                <div style={{ font: '600 0.75rem/1.3 var(--font-ui)', color: 'var(--text-strong)' }}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                aspectRatio: '3/4', borderRadius: 10,
                background: 'var(--grad-portrait)',
                opacity: 0.5 + i * 0.1,
              }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: '✦', title: 'Identity Lock', desc: 'Generate a character once. Every image after stays locked to that exact face, skin tone, and presence.' },
    { icon: '◈', title: 'Casting Sheets', desc: 'Professional casting-style reference photos in seconds. Black tee, white background, multiple angles.' },
    { icon: '◇', title: 'Image Generator', desc: 'Create on-brand lifestyle content, campaign shots, and editorial imagery — all identity-consistent.' },
    { icon: '◉', title: 'Thee Director', desc: 'AI-powered creative direction. Describe a vision, get a full shot list and prompt pack back.' },
    { icon: '⬡', title: 'Campaigns', desc: 'Plan and generate full content campaigns. 30 days of content, one cohesive visual identity.' },
    { icon: '◎', title: 'Character Library', desc: 'Save, organize, and reuse characters across every project. Your roster, always ready.' },
  ];

  return (
    <section id="features" style={{ background: 'var(--white)', padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '0.14em', color: 'var(--coral)', textTransform: 'uppercase', marginBottom: 16 }}>
            Everything you need
          </div>
          <h2 style={{ font: '600 3rem/1.05 var(--font-display)', color: 'var(--text-strong)', marginBottom: 16 }}>
            Built for creators who<br />move fast
          </h2>
          <p style={{ font: 'var(--text-lg)', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto' }}>
            One studio. Every tool you need to build, generate, and ship consistent creative.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: 'var(--cream)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
              padding: '32px',
              transition: 'var(--t-base)',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)',
                background: 'var(--rose-glass)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: '1.25rem/1 var(--font-ui)',
                color: 'var(--coral)',
                marginBottom: 20,
                border: '1px solid var(--blush)',
              }}>{f.icon}</div>
              <h3 style={{ font: '600 1.125rem/1.2 var(--font-display)', color: 'var(--text-strong)', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ font: 'var(--text-base)', color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onCTA }) {
  const [yearly, setYearly] = React.useState(false);

  return (
    <section id="pricing" style={{ background: 'var(--cream)', padding: '100px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '0.14em', color: 'var(--coral)', textTransform: 'uppercase', marginBottom: 16 }}>
          Pricing
        </div>
        <h2 style={{ font: '600 3rem/1.05 var(--font-display)', color: 'var(--text-strong)', marginBottom: 16 }}>
          Start free, go pro<br />when you're ready
        </h2>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 56, marginTop: 32 }}>
          <span style={{ font: 'var(--text-sm)', color: yearly ? 'var(--text-muted)' : 'var(--text-strong)', fontWeight: yearly ? 400 : 600 }}>Monthly</span>
          <button onClick={() => setYearly(y => !y)} style={{
            width: 44, height: 24, borderRadius: 999,
            background: yearly ? 'var(--coral)' : 'var(--border)',
            border: 'none', cursor: 'pointer', position: 'relative',
            transition: 'var(--t-base)',
          }}>
            <span style={{
              position: 'absolute', top: 3, left: yearly ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              transition: 'var(--t-base)',
            }} />
          </button>
          <span style={{ font: 'var(--text-sm)', color: yearly ? 'var(--text-strong)' : 'var(--text-muted)', fontWeight: yearly ? 600 : 400 }}>
            Yearly <span style={{ color: 'var(--coral)', fontWeight: 600 }}>save 20%</span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Free */}
          <div style={{
            background: 'var(--white)', borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)', padding: '36px 32px',
            textAlign: 'left',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Free</div>
            <div style={{ font: '600 3rem/1 var(--font-display)', color: 'var(--text-strong)', marginBottom: 4 }}>$0</div>
            <div style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 32 }}>Forever free</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Build your first character', 'Casting sheet generation', '5 reference photos'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, font: 'var(--text-base)', color: 'var(--text-body)' }}>
                  <span style={{ color: 'var(--status-ready)', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={onCTA} style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
              background: 'transparent', border: '1px solid var(--border)',
              font: '600 0.9375rem/1 var(--font-ui)', color: 'var(--text-body)',
              cursor: 'pointer', transition: 'var(--t-base)',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--coral)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              Get started free
            </button>
          </div>

          {/* Pro */}
          <div style={{
            background: 'var(--plum)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid transparent',
            padding: '36px 32px',
            textAlign: 'left',
            boxShadow: 'var(--shadow-coral)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 160, height: 160, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,107,74,0.2) 0%, transparent 70%)',
            }} />
            <div style={{ font: '600 0.75rem/1 var(--font-ui)', letterSpacing: '0.14em', color: 'var(--champagne)', textTransform: 'uppercase', marginBottom: 12 }}>Pro</div>
            <div style={{ font: '600 3rem/1 var(--font-display)', color: '#fff', marginBottom: 4 }}>
              {yearly ? '$15' : '$19'}
            </div>
            <div style={{ font: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>per month{yearly ? ', billed yearly' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {['Everything in Free', 'Unlimited image generation', 'Thee Director', 'Campaigns & planning', 'Character library', 'Priority generation'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, font: 'var(--text-base)', color: 'rgba(255,255,255,0.85)' }}>
                  <span style={{ color: 'var(--champagne)', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={onCTA} style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
              background: 'var(--grad-coral)', border: 'none',
              font: '600 0.9375rem/1 var(--font-ui)', color: '#fff',
              cursor: 'pointer', transition: 'var(--t-base)',
              boxShadow: 'var(--shadow-coral)',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Go Pro
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      background: 'var(--plum)',
      padding: '56px 24px',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ font: '700 1rem/1 var(--font-display)', color: 'var(--champagne)' }}>T</span>
        </div>
        <span style={{ font: '600 1rem/1 var(--font-display)', color: 'var(--text-on-dark)' }}>Thee Studio</span>
      </div>
      <p style={{ font: 'var(--text-sm)', color: 'rgba(255,255,255,0.35)', marginBottom: 0 }}>
        © {new Date().getFullYear()} Thee Studio. All rights reserved.
      </p>
    </footer>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const goToAuth = () => navigate('/auth');

  return (
    <div style={{ fontFamily: 'var(--font-ui)' }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,247,242,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--grad-plum)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ font: '700 0.875rem/1 var(--font-display)', color: 'var(--champagne)' }}>T</span>
          </div>
          <span style={{ font: '600 1rem/1 var(--font-display)', color: 'var(--text-strong)' }}>Thee Studio</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="#features" style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>Features</a>
          <a href="#pricing" style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>Pricing</a>
          <button onClick={goToAuth} style={{ font: 'var(--text-sm)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Log in</button>
          <button onClick={goToAuth} style={{
            background: 'var(--grad-coral)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '8px 18px',
            font: '600 0.875rem/1 var(--font-ui)', cursor: 'pointer',
          }}>
            Start free
          </button>
        </div>
      </nav>

      <div style={{ paddingTop: 64 }}>
        <HeroSection onCTA={goToAuth} />
        <FeaturesSection />
        <PricingSection onCTA={goToAuth} />
        <Footer />
      </div>
    </div>
  );
}
