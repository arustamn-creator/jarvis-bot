import React from "react";

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero__content">
        <span className="hero__badge">AI-powered assistant</span>
        <h1 className="hero__title">
          Your personal <br />
          <span className="hero__accent">Jarvis</span> is here
        </h1>
        <p className="hero__subtitle">
          Automate freelance work, generate marketing materials,
          and manage clients — all through Telegram.
        </p>
        <div className="hero__actions">
          <a href="https://t.me/myJarvis_maxbot" className="btn btn--primary">
            Launch in Telegram
          </a>
          <a href="#features" className="btn btn--ghost">
            See what it can do
          </a>
        </div>
      </div>

      <style>{`
        .hero {
          min-height: 100vh;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .hero__content {
          max-width: 680px;
          text-align: center;
        }

        .hero__badge {
          display: inline-block;
          padding: 6px 16px;
          border: 1px solid #2a2a2a;
          border-radius: 100px;
          color: #888;
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 32px;
        }

        .hero__title {
          font-size: clamp(40px, 8vw, 72px);
          font-weight: 700;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 24px;
          letter-spacing: -0.02em;
        }

        .hero__accent {
          color: #f97316;
        }

        .hero__subtitle {
          font-size: 18px;
          line-height: 1.6;
          color: #666;
          margin: 0 0 48px;
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero__actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .btn--primary {
          background: #f97316;
          color: #fff;
          border: 2px solid #f97316;
        }

        .btn--primary:hover {
          background: #ea6c0a;
          border-color: #ea6c0a;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(249, 115, 22, 0.35);
        }

        .btn--ghost {
          background: transparent;
          color: #aaa;
          border: 2px solid #2a2a2a;
        }

        .btn--ghost:hover {
          border-color: #444;
          color: #fff;
        }
      `}</style>
    </section>
  );
}
