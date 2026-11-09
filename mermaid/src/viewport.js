export const createDiagramViewport = (container, diagram, onChange) => {
  let width = 0;
  let height = 0;
  let scale = 1;
  let x = 0;
  let y = 0;
  let fitted = true;
  let drag = null;

  const apply = () => {
    const svg = diagram.querySelector("svg");
    if (svg) {
      svg.style.width = `${width}px`;
      svg.style.height = `${height}px`;
      svg.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
    onChange({ scale, fitted });
  };

  const fit = () => {
    fitted = true;
    if (!width || !height) return;
    scale = Math.max(
      0.01,
      Math.min((container.clientWidth - 48) / width, (container.clientHeight - 48) / height, 1),
    );
    x = (container.clientWidth - width * scale) / 2;
    y = (container.clientHeight - height * scale) / 2;
    apply();
  };

  const zoomBy = (
    factor,
    point = { x: container.clientWidth / 2, y: container.clientHeight / 2 },
  ) => {
    if (!diagram.querySelector("svg")) return;
    const next = Math.max(0.01, Math.min(8, scale * factor));
    x = point.x - ((point.x - x) * next) / scale;
    y = point.y - ((point.y - y) * next) / scale;
    scale = next;
    fitted = false;
    apply();
  };

  container.addEventListener(
    "wheel",
    (event) => {
      if (!diagram.querySelector("svg")) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? container.clientHeight : 1;
      const bounds = container.getBoundingClientRect();
      zoomBy(Math.exp(-event.deltaY * unit * 0.0015), {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    { passive: false },
  );
  container.addEventListener("pointerdown", (event) => {
    if (drag || (event.button !== 0 && event.button !== 1) || !diagram.querySelector("svg")) return;
    event.preventDefault();
    container.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: x, originY: y };
    container.setPointerCapture(event.pointerId);
    container.classList.add("is-panning");
  });
  container.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    x = drag.originX + event.clientX - drag.x;
    y = drag.originY + event.clientY - drag.y;
    fitted = false;
    apply();
  });

  const stopDrag = (event) => {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    container.classList.remove("is-panning");
    if (container.hasPointerCapture(event.pointerId))
      container.releasePointerCapture(event.pointerId);
  };

  container.addEventListener("pointerup", stopDrag);
  container.addEventListener("pointercancel", stopDrag);
  container.addEventListener("lostpointercapture", stopDrag);
  container.addEventListener("keydown", (event) => {
    const movement = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    }[event.key];
    if (movement) {
      event.preventDefault();
      [x, y] = [x + movement[0], y + movement[1]];
      fitted = false;
      apply();
    }
    if (event.key === "+" || event.key === "=") zoomBy(1.2);
    if (event.key === "-") zoomBy(1 / 1.2);
    if (event.key === "0") fit();
  });
  new ResizeObserver(() => {
    if (fitted) fit();
  }).observe(container);
  return {
    zoomBy,
    fit,
    reset: () => {
      fitted = true;
      width = 0;
      height = 0;
    },
    setSize: (nextWidth, nextHeight) => {
      width = nextWidth;
      height = nextHeight;
      if (fitted) fit();
      else apply();
    },
  };
};
