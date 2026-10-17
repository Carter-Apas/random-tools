import { Link, Route, Routes } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Monitor,
  Smartphone,
  Users,
} from "lucide-react";
import { Shell } from "./components/ui";
import { HostScreen } from "./features/host/HostScreen";
import { PlayerScreen } from "./features/player/PlayerScreen";

function LandingPage() {
  return (
    <Shell className="landing-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> Good company. Great questions.
          </p>
          <h1>
            Bring your people.
            <br />
            We’ll bring
            <br />
            <span>the questions.</span>
          </h1>
          <p className="hero-description">
            A quiz night on absolutely anything. Pick a topic, gather your
            friends, and see who knows a little too much.
          </p>
          <div className="hero-actions">
            <Link to="/host" className="button button-primary">
              Let’s play <ArrowUpRight size={18} />
            </Link>
            <span>No accounts. Just a room code.</span>
          </div>
        </div>
        <div className="hero-art" aria-label="A preview of a Roundtable quiz">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <span className="art-spark spark-one" aria-hidden="true">
            ✳
          </span>
          <span className="art-spark spark-two" aria-hidden="true">
            ✳
          </span>
          <div className="preview-note">
            <Users size={15} /> Your people. Your kind of trivia.
          </div>
          <div className="preview-card">
            <div className="preview-top">
              <span className="mini-mark">
                <CircleHelp size={18} />
              </span>
              <span>A little taster</span>
              <span>01 / 10</span>
            </div>
            <h2>
              What do you call a<br />
              group of flamingos?
            </h2>
            <div className="preview-options">
              <div>
                <span>A</span> A flock
              </div>
              <div className="preview-correct">
                <span>B</span> A flamboyance <Check size={17} />
              </div>
              <div>
                <span>C</span> A parade
              </div>
              <div>
                <span>D</span> A party
              </div>
            </div>
            <div className="preview-bottom">
              <span>Something new to know.</span>
              <span>+ 1 fun fact ↗</span>
            </div>
          </div>
          <div className="preview-sticker">
            <span>
              Good answers.
              <br />
              <strong>Better company.</strong>
            </span>
            <ArrowUpRight size={25} />
          </div>
        </div>
      </section>

      <section className="entry-section" aria-label="Choose how to play">
        <Link to="/host" className="entry-card entry-host">
          <div className="entry-icon">
            <Monitor size={22} />
          </div>
          <div className="entry-copy">
            <span className="eyebrow">You’re in charge</span>
            <h2>Host a lobby</h2>
            <p>Pick the topic. We’ll take it from there.</p>
          </div>
          <span className="entry-arrow">
            <ArrowUpRight size={23} />
          </span>
        </Link>
        <Link to="/play" className="entry-card entry-player">
          <div className="entry-icon">
            <Smartphone size={22} />
          </div>
          <div className="entry-copy">
            <span className="eyebrow">Got a room code?</span>
            <h2>Join a lobby</h2>
            <p>Bring your phone and your best guesses.</p>
          </div>
          <span className="entry-arrow">
            <ArrowUpRight size={23} />
          </span>
        </Link>
      </section>

      <section className="topic-section">
        <div>
          <p className="eyebrow">There’s a quiz for that.</p>
          <h2>Follow your curiosity.</h2>
        </div>
        <div className="topic-links">
          {[
            "The natural world",
            "90s pop culture",
            "Food & drink",
            "A bit of everything",
          ].map((topic) => (
            <Link key={topic} to={`/host?topic=${encodeURIComponent(topic)}`}>
              {topic}
              <ArrowRight size={15} />
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/host" element={<HostScreen />} />
      <Route path="/play" element={<PlayerScreen />} />
    </Routes>
  );
}
