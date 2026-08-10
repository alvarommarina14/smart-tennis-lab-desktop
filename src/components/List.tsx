import type { ReactNode } from 'react';

import './List.css';

type RowProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
  selected?: boolean;
};

export function Row({ title, subtitle, badge, onClick, selected }: RowProps) {
  const className = `stl-row${selected ? ' stl-row--selected' : ''}${onClick ? '' : ' stl-row--static'}`;

  if (!onClick) {
    return (
      <div className={className}>
        <RowBody title={title} subtitle={subtitle} badge={badge} />
      </div>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      <RowBody title={title} subtitle={subtitle} badge={badge} selected={selected} />
    </button>
  );
}

function RowBody({ title, subtitle, badge, selected }: Omit<RowProps, 'onClick'>) {
  return (
    <>
      <span className="stl-row__text">
        <span className="stl-row__title">{title}</span>
        {subtitle ? <span className="stl-row__subtitle">{subtitle}</span> : null}
      </span>
      {badge ? <span className="stl-row__badge">{badge}</span> : null}
      {selected ? <span className="stl-row__check">✓</span> : null}
    </>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="stl-empty">
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

export function ScreenHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <header className="stl-screen-header">
      <h1>{title}</h1>
      {actions ? <div className="stl-screen-header__actions">{actions}</div> : null}
    </header>
  );
}
