/**
 * Shared.tsx — Backwards-compatibility bridge re-exporting locked GovUI components.
 * New code should import directly from './GovUI'.
 */

export {
  MinistryEmblem,
  TricolorRule,
  GovAlert as Notice,
  GovBadge as StateBadge,
  GovButton,
  GovCard,
  GovField as FormField,
  GovPageHeader as PageTitle,
  GovPagination as Pagination,
  GovTable as DataTable,
  StatCard as Stat,
  inputCls,
} from './GovUI';

export function formatDate(value?: string) {
  if (!value) return 'Not provided';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
