import { AppHeader, Button, Panel as MonoPanel } from "@random-tools/mono";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import { cn } from "../lib/cn";

export const Shell = ({ children, className }: PropsWithChildren<{ className?: string }>) => (
  <div className="app-shell">
    <a className="skip-link" href="#main">
      Skip to content
    </a>
    <AppHeader title="Quiz generator">
      <nav aria-label="Main navigation">
        <NavLink to="/host" className={({ isActive }) => cn("nav-link", isActive && "is-active")}>
          Host<span className="nav-extended"> a game</span>
        </NavLink>
        <NavLink
          to="/play"
          className={({ isActive }) => cn("nav-link nav-join", isActive && "is-active")}
        >
          <span>
            Join<span className="nav-extended"> a game</span>
          </span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </NavLink>
      </nav>
    </AppHeader>
    <main id="main" className={cn("page-content", className)}>
      {children}
    </main>
    <footer className="site-footer">
      <span>A good excuse to get everyone together.</span>
      <span>Roundtable · Play a little.</span>
    </footer>
  </div>
);

export const Panel = ({ children, className }: PropsWithChildren<{ className?: string }>) => (
  <MonoPanel className={cn("panel", className)}>{children}</MonoPanel>
);

export const AccentButton = ({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <Button variant="primary" className={className} {...props}>
    {children}
  </Button>
);

export const GhostButton = ({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <Button className={className} {...props}>
    {children}
  </Button>
);

export const SectionLabel = ({ children }: PropsWithChildren) => (
  <p className="section-label">{children}</p>
);
