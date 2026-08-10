import { apiRequest } from '@/api/client';

export type Discipline = 'SINGLES' | 'DOUBLES';
export type KpiKind = 'COUNTER' | 'DERIVED';
export type KpiUnit = 'COUNT' | 'PERCENTAGE' | 'MINUTES';

export type Kpi = {
  code: string;
  label: string;
  kind: KpiKind;
  unit: KpiUnit;
};

export type KpiCategory = {
  code: string;
  label: string;
  kpis: Kpi[];
};

export type KpiCatalog = {
  discipline: Discipline;
  categories: KpiCategory[];
};

export function fetchKpiCatalog(discipline: Discipline = 'SINGLES'): Promise<KpiCatalog> {
  return apiRequest<KpiCatalog>(`/api/v1/kpis?discipline=${discipline}`);
}
