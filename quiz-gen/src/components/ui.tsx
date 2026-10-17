import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../lib/cn";

export function Shell({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Roundtable home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          roundtable<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink
            to="/host"
            className={({ isActive }) =>
              cn("nav-link", isActive && "is-active")
            }
          >
            Host<span className="nav-extended"> a game</span>
          </NavLink>
          <NavLink
            to="/play"
            className={({ isActive }) =>
              cn("nav-link nav-join", isActive && "is-active")
            }
          >
            Join<span className="nav-extended"> a game</span>{" "}
            <ArrowUpRight size={15} aria-hidden="true" />
          </NavLink>
        </nav>
      </header>
      <main id="main" className={cn("page-content", className)}>
        {children}
      </main>
      <footer className="site-footer">
        <span>A good excuse to get everyone together.</span>
        <span>Roundtable · Play a little.</span>
      </footer>
    </div>
  );
}

export function Panel({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function AccentButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn("button button-primary", className)} {...props}>
      {children}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn("button button-secondary", className)} {...props}>
      {children}
    </button>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return <p className="section-label">{children}</p>;
}
