type IconProps = { className?: string };

function base(className?: string) {
  return className ?? "h-6 w-6";
}

export function IconMonitor({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" d="M8 20h8M12 16v4" />
    </svg>
  );
}

export function IconNetwork({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="6" cy="7" r="2.25" />
      <circle cx="18" cy="7" r="2.25" />
      <circle cx="12" cy="17" r="2.25" />
      <path strokeLinecap="round" d="M8 8.2 10.6 15M16 8.2 13.4 15M8.2 7h7.6" />
    </svg>
  );
}

export function IconWorkflow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="3.5" width="7" height="6" rx="1.5" />
      <rect x="14" y="14.5" width="7" height="6" rx="1.5" />
      <path strokeLinecap="round" d="M6.5 9.5v3h11V14.5" />
    </svg>
  );
}

export function IconHome({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.5v-5.5h-3V21H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

export function IconBuilding({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinejoin="round" d="M4 20.5h16M6 20.5V5.5A1 1 0 0 1 7 4.5h6a1 1 0 0 1 1 1v15" />
      <path strokeLinecap="round" d="M9 8h2M9 11.5h2M9 15h2M14 20.5v-7h4v7M16 16.5h.01" />
    </svg>
  );
}

export function IconTruck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinejoin="round" d="M3 7.5h11v8H3v-8Z" />
      <path strokeLinejoin="round" d="M14 10.5h4.2L21 13.2V15.5h-7" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="17.2" cy="17.5" r="1.6" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinejoin="round" d="M12 3.5 19 6.2v5.4c0 4.2-2.8 7.2-7 8.9-4.2-1.7-7-4.7-7-8.9V6.2L12 3.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.8 12 2.1 2.1 4.3-4.4" />
    </svg>
  );
}

export function IconBadge({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="9" r="4.25" />
      <path strokeLinejoin="round" d="m8.2 12.6-1.2 7 5-2.4 5 2.4-1.2-7" />
    </svg>
  );
}

export function IconHeadset({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" d="M4.5 13v-1a7.5 7.5 0 0 1 15 0v1" />
      <rect x="3.5" y="13" width="4" height="6" rx="1.4" />
      <rect x="16.5" y="13" width="4" height="6" rx="1.4" />
      <path strokeLinecap="round" d="M16.5 18.5v.4A2.1 2.1 0 0 1 14.4 21H12" />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <path strokeLinecap="round" d="M3.8 19.2a5.4 5.4 0 0 1 10.4 0" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path strokeLinecap="round" d="M16.2 14.2a4.6 4.6 0 0 1 4 4.8" />
    </svg>
  );
}

export function IconReceipt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinejoin="round" d="M7 3.5h10a1 1 0 0 1 1 1V21l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V4.5a1 1 0 0 1 1-1Z" />
      <path strokeLinecap="round" d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function IconSliders({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="2" fill="white" />
      <circle cx="15" cy="12" r="2" fill="white" />
      <circle cx="10" cy="17" r="2" fill="white" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="M12 8v4.5l3 1.5" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.2 2.3 2.3 4.7-5" />
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconArrow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconMail({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 8 7 5 7-5" />
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinejoin="round" d="M8.2 4.5h2.2l1.2 3.2-1.6 1.1a12.5 12.5 0 0 0 5.2 5.2l1.1-1.6 3.2 1.2v2.2a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 6.7 6.1a1.5 1.5 0 0 1 1.5-1.6Z" />
    </svg>
  );
}

export function IconLinkedIn({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden="true">
      <path d="M6.5 9H4V20h2.5V9ZM5.2 4A1.6 1.6 0 1 0 5.2 7.2 1.6 1.6 0 0 0 5.2 4ZM20 20h-2.5v-5.6c0-1.6-.6-2.6-2-2.6-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V20H11V9h2.4v1.5c.4-.7 1.4-1.8 3.3-1.8 2.4 0 4.3 1.6 4.3 5V20Z" />
    </svg>
  );
}

export function IconFacebook({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="currentColor" aria-hidden="true">
      <path d="M14.2 20v-7.1h2.4l.4-2.8h-2.8V8.4c0-.8.2-1.4 1.4-1.4H17V4.5c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2.1H9v2.8h2.4V20h2.8Z" />
    </svg>
  );
}

export function IconInstagram({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base(className)} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
