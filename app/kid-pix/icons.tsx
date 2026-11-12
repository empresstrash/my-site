export function ToolIcon({ name }: { name: string }) {
  return (
    <svg
      className="kp-icon"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {mark(name)}
    </svg>
  );
}

function mark(name: string) {
  switch (name) {
    case "draw":
    case "pencil":
      return (
        <>
          <path d="M7 25 L20 12" />
          <path d="M20 12 L24 8 L26 10 L22 14 Z" fill="currentColor" />
          <path d="M6 26 L9 23" />
        </>
      );
    case "brush":
      return (
        <>
          <path d="M8 24 L18 12" />
          <path d="M18 12 C22 8 26 10 24 15 C22 18 18 16 18 12" fill="currentColor" />
        </>
      );
    case "marker":
      return (
        <>
          <path d="M8 24 L20 12" />
          <path d="M20 10 L25 15 L21 16 Z" fill="currentColor" />
          <path d="M7 25 L10 22" />
        </>
      );
    case "spray":
      return (
        <>
          <rect x="12" y="12" width="8" height="12" rx="1.5" fill="currentColor" stroke="none" />
          <path d="M14 12 V9 H18" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
          <circle cx="11" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      );
    case "chalk":
      return <path d="M8 22 L22 10" strokeWidth="5" />;
    case "crayon":
    case "wax":
      return (
        <>
          <path d="M10 22 L18 14 L22 18 L14 26 Z" fill="currentColor" />
          <path d="M18 14 L23 9 L26 12 L21 17" />
        </>
      );
    case "wacky":
      return (
        <>
          <path d="M5 22 C10 8 12 24 17 12 C21 4 24 20 28 10" />
          <circle cx="26" cy="7" r="2" fill="currentColor" stroke="none" />
        </>
      );
    case "zigzag":
      return <path d="M5 20 L11 10 L16 20 L22 10 L27 20" />;
    case "rainbow":
      return (
        <>
          <path d="M6 22 A10 10 0 0 1 26 22" />
          <path d="M10 22 A6 6 0 0 1 22 22" />
        </>
      );
    case "dots":
      return (
        <>
          <circle cx="9" cy="16" r="3" fill="currentColor" stroke="none" />
          <circle cx="16" cy="11" r="3" fill="currentColor" stroke="none" />
          <circle cx="23" cy="17" r="3" fill="currentColor" stroke="none" />
        </>
      );
    case "spark":
    case "star":
      return <path d="M16 4 L19 12 L28 13 L21 19 L23 28 L16 23 L9 28 L11 19 L4 13 L13 12 Z" fill="currentColor" />;
    case "bubbles":
      return (
        <>
          <circle cx="12" cy="18" r="6" />
          <circle cx="21" cy="12" r="4" />
        </>
      );
    case "confetti":
      return (
        <>
          <rect x="6" y="14" width="8" height="4" transform="rotate(-30 10 16)" fill="currentColor" stroke="none" />
          <rect x="16" y="8" width="8" height="4" transform="rotate(25 20 10)" fill="currentColor" stroke="none" />
          <rect x="14" y="18" width="8" height="4" transform="rotate(10 18 20)" fill="currentColor" stroke="none" />
        </>
      );
    case "drip":
      return <path d="M16 5 C16 5 8 16 8 21 A8 8 0 0 0 24 21 C24 16 16 5 16 5 Z" fill="currentColor" />;
    case "boxes":
      return (
        <>
          <rect x="5" y="6" width="10" height="10" />
          <rect x="16" y="15" width="10" height="10" />
        </>
      );
    case "vine":
      return (
        <>
          <path d="M8 26 C12 18 14 16 24 6" />
          <path d="M14 16 C10 14 10 10 14 10" />
        </>
      );
    case "tree":
      return (
        <>
          <path d="M16 28 V16" />
          <path d="M8 16 L16 5 L24 16 Z" fill="currentColor" />
        </>
      );
    case "line":
      return <path d="M6 26 L26 6" />;
    case "shape":
    case "rect":
    case "outline":
      return <rect x="6" y="7" width="20" height="18" />;
    case "filled":
      return <rect x="6" y="7" width="20" height="18" fill="currentColor" />;
    case "oval":
      return <ellipse cx="16" cy="16" rx="11" ry="8" />;
    case "circle":
      return <circle cx="16" cy="16" r="10" />;
    case "triangle":
      return <path d="M16 6 L27 26 H5 Z" />;
    case "curve":
      return <path d="M5 24 Q16 2 27 20" />;
    case "polygon":
      return <path d="M16 5 L27 12 L24 25 L8 25 L5 12 Z" />;
    case "round":
      return <rect x="6" y="8" width="20" height="16" rx="6" />;
    case "close":
      return <path d="M7 17 L13 23 L25 9" />;
    case "fill":
      return (
        <>
          <path d="M10 15 H22 L20 26 H12 Z" fill="currentColor" />
          <path d="M14 15 V10 H20" />
          <path d="M20 10 L25 6" />
        </>
      );
    case "stamp":
    case "still":
      return (
        <>
          <rect x="8" y="18" width="16" height="8" rx="1" />
          <path d="M13 18 V10 H19 V18" />
        </>
      );
    case "moopie":
      return (
        <>
          <rect x="10" y="16" width="12" height="7" />
          <path d="M14 16 V11 H18 V16" />
          <path d="M6 10 A6 6 0 0 1 12 6" />
        </>
      );
    case "mash":
      return (
        <>
          <rect x="5" y="8" width="12" height="12" />
          <rect x="15" y="14" width="12" height="12" />
        </>
      );
    case "letter":
    case "plain":
      return (
        <text x="16" y="23" textAnchor="middle" fontSize="18" fontFamily="sans-serif" fill="currentColor" stroke="none">
          A
        </text>
      );
    case "bubble":
      return <circle cx="16" cy="16" r="10" />;
    case "skinny":
      return <path d="M16 6 V26" strokeWidth="4" />;
    case "eraser":
      return <rect x="7" y="12" width="18" height="10" rx="2" transform="rotate(-20 16 17)" />;
    case "pick":
      return (
        <>
          <path d="M12 22 L20 10" />
          <circle cx="22" cy="8" r="3" />
        </>
      );
    case "van":
      return (
        <>
          <path d="M4 20 H12 L16 13 H24 L28 20 H28 V24 H4 Z" fill="currentColor" />
          <circle cx="10" cy="24" r="2.2" />
          <circle cx="22" cy="24" r="2.2" />
        </>
      );
    case "mix":
      return (
        <>
          <circle cx="16" cy="8" r="3" />
          <path d="M16 11 V16" />
          <path d="M10 26 C10 18 22 18 22 26" />
          <path d="M13 20 V27" />
          <path d="M19 20 V27" />
        </>
      );
    case "hand":
      return (
        <>
          <path d="M12 16 V8" />
          <path d="M16 16 V6" />
          <path d="M20 16 V9" />
          <path d="M12 16 H8 V22 A8 6 0 0 0 22 22 V16" />
        </>
      );
    case "mirror":
      return (
        <>
          <path d="M16 5 V27" />
          <path d="M7 10 L12 16 L7 22" />
          <path d="M25 10 L20 16 L25 22" />
        </>
      );
    case "flip":
      return <path d="M6 24 L16 8 L26 24 Z" />;
    case "invert":
      return (
        <>
          <circle cx="16" cy="16" r="10" />
          <path d="M16 6 V26" />
          <path d="M16 6 A10 10 0 0 1 16 26 Z" fill="currentColor" />
        </>
      );
    case "pop":
      return (
        <>
          <circle cx="16" cy="16" r="4" fill="currentColor" stroke="none" />
          <path d="M16 4 V9 M16 23 V28 M4 16 H9 M23 16 H28 M7 7 L10 10 M22 22 L25 25 M25 7 L22 10 M10 22 L7 25" />
        </>
      );
    case "melt":
      return <path d="M6 8 H26 V16 C22 22 22 18 16 22 C10 18 10 24 6 18 Z" fill="currentColor" />;
    case "swirl":
      return <path d="M16 16 C16 12 22 12 22 16 C22 22 10 22 10 16 C10 8 24 8 24 16" />;
    case "pixel":
      return (
        <>
          <rect x="6" y="6" width="8" height="8" fill="currentColor" stroke="none" />
          <rect x="18" y="6" width="8" height="8" />
          <rect x="6" y="18" width="8" height="8" />
          <rect x="18" y="18" width="8" height="8" fill="currentColor" stroke="none" />
        </>
      );
    case "smear":
      return (
        <>
          <path d="M5 11 H24" />
          <path d="M8 16 H27" />
          <path d="M5 21 H22" />
        </>
      );
    case "kaleid":
      return <path d="M16 4 L28 16 L16 28 L4 16 Z" />;
    case "glitch":
      return (
        <>
          <path d="M5 10 H22" />
          <path d="M10 16 H27" />
          <path d="M6 22 H20" />
        </>
      );
    case "blur":
      return (
        <>
          <circle cx="16" cy="16" r="4" />
          <circle cx="16" cy="16" r="8" />
          <circle cx="16" cy="16" r="12" />
        </>
      );
    case "fade":
      return (
        <>
          <circle cx="10" cy="16" r="4" fill="currentColor" stroke="none" />
          <circle cx="18" cy="16" r="3" />
          <circle cx="24" cy="16" r="2" />
        </>
      );
    case "tv":
      return (
        <>
          <rect x="5" y="8" width="22" height="16" />
          <path d="M12 8 L10 4 M20 8 L22 4" />
          <path d="M8 13 H24 M8 17 H24 M8 21 H24" />
        </>
      );
    case "heart":
      return <path d="M16 26 C6 18 6 10 12 10 C14 10 16 12 16 12 C16 12 18 10 20 10 C26 10 26 18 16 26 Z" fill="currentColor" />;
    case "smile":
      return (
        <>
          <circle cx="16" cy="16" r="10" />
          <path d="M11 14 H13 M19 14 H21 M11 19 Q16 23 21 19" />
        </>
      );
    case "cat":
      return (
        <>
          <circle cx="16" cy="18" r="8" />
          <path d="M8 14 L6 6 L14 12 M24 14 L26 6 L18 12" />
        </>
      );
    case "flower":
      return (
        <>
          <circle cx="16" cy="16" r="3" fill="currentColor" stroke="none" />
          <circle cx="16" cy="8" r="3" />
          <circle cx="16" cy="24" r="3" />
          <circle cx="8" cy="16" r="3" />
          <circle cx="24" cy="16" r="3" />
        </>
      );
    case "moon":
      return <path d="M18 6 A10 10 0 1 0 18 26 A7 7 0 1 1 18 6 Z" fill="currentColor" />;
    case "bolt":
      return <path d="M18 4 L8 18 H15 L13 28 L24 13 H17 Z" fill="currentColor" />;
    case "house":
      return (
        <>
          <path d="M6 16 L16 6 L26 16 V27 H6 Z" />
          <path d="M13 27 V19 H19 V27" />
        </>
      );
    case "fish":
      return (
        <>
          <ellipse cx="15" cy="16" rx="8" ry="5" />
          <path d="M23 16 L29 11 V21 Z" fill="currentColor" />
        </>
      );
    case "crown":
      return <path d="M5 24 L8 12 L16 18 L24 10 L27 24 Z" fill="currentColor" />;
    case "ghost":
      return <path d="M8 15 A8 8 0 0 1 24 15 V26 L20 23 L16 26 L12 23 L8 26 Z" fill="currentColor" />;
    default:
      return <circle cx="16" cy="16" r="4" />;
  }
}
