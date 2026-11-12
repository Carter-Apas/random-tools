import { useLayoutEffect, useRef } from "react";

export const usePlayViewport = (playing: boolean) => {
  const shell = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = shell.current;
    if (!playing || !element) return;
    const viewport = window.visualViewport;

    const update = () => {
      element.style.setProperty("--play-height", `${viewport?.height ?? window.innerHeight}px`);
      element.style.setProperty("--play-width", `${viewport?.width ?? window.innerWidth}px`);
      element.style.setProperty("--play-top", `${viewport?.offsetTop ?? 0}px`);
      element.style.setProperty("--play-left", `${viewport?.offsetLeft ?? 0}px`);
    };

    document.documentElement.classList.add("playing-page");
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      document.documentElement.classList.remove("playing-page");
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.scrollTo(0, 0);
    };
  }, [playing]);
  return shell;
};
