"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function CollapsibleCopy({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLSpanElement>(null);
  const [more, setMore] = useState(false);
  const id = useId();
  const copy = text.trim();

  useEffect(() => {
    const el = body.current;
    if (!el || open) return;
    const measure = () => {
      setMore(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [copy, open]);

  if (!copy) return null;

  return (
    <p className={`${className ?? ""} collapsible-copy${open ? " is-open" : ""}`.trim()}>
      <span
        id={id}
        ref={body}
        className={open ? "collapsible-copy-body" : "collapsible-copy-body is-clamped"}
      >
        {copy}
      </span>
      {more || open ? (
        <button
          type="button"
          className="collapsible-copy-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "show less" : "read more"}
        </button>
      ) : null}
    </p>
  );
}
