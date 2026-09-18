import type { ReactNode } from 'react';

import './Table.css';

export function SectionTitle({ label, count }: { label: string; count?: number }) {
  return (
    <div className="stl-section-title">
      <span>{label}</span>
      {count !== undefined ? <span className="stl-section-title__count">{count}</span> : null}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="stl-tablewrap">
      <table className="stl-table">
        <thead>
          <tr>
            {head.map((cell, index) => (
              <th key={index}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

type TagTone = 'live' | 'done' | 'draft' | 'neutral';

export function Tag({ tone = 'neutral', children }: { tone?: TagTone; children: ReactNode }) {
  return <span className={`stl-tag stl-tag--${tone}`}>{children}</span>;
}
