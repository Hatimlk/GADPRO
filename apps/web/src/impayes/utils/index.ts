import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(montant);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR');
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function joursDepuis(dateStr: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Pour une relation CDC, le porteur est la partie du partenaire situأ©e aprأ¨s
 * le premier deux-points (ex. "ZEKNOUN RACHID : LAABIDI" -> "LAABIDI").
 */
export function getPorteur(nomTire: string, relation: string): string {
  if (relation !== 'CDC') return '-';

  const separatorIndex = nomTire.indexOf(':');
  if (separatorIndex === -1) return '-';

  return nomTire.slice(separatorIndex + 1).trim() || '-';
}

export type SemanticTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

/**
 * Maps a dossier's statut label to a semantic tone. Keys must match the
 * accented labels seeded in backend/migrations/002_seed_data.sql exactly â€”
 * a prior unaccented version of this map silently never matched and every
 * page reimplemented this logic inline instead.
 */
export function getStatutColor(statut: string): SemanticTone {
  const map: Record<string, SemanticTone> = {
    'Contentieux': 'danger',
    'Prأ©-contentieux': 'warning',
    'A rendre au client': 'warning',
    'A voir avec le commercial': 'neutral',
    'Attente retour du client': 'neutral',
    'Valeur أ  reprأ©senter': 'info',
    'Rأ¨glement أ  recevoir': 'success',
    'Rأ¨glement أ  rأ©cupأ©rer': 'success',
    'Rأ¨glement partiel': 'info',
    'Rأ©gularisأ© - OK': 'success',
    'Reprأ©sentأ©': 'info',
    'Sans suite': 'neutral',
    'Valeur أ  remplacer': 'warning',
    "Valeur envoyأ©e أ  l'encaissement": 'info',
  };
  return map[statut] || 'neutral';
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  responsable_recouvrement: 'Responsable Recouvrement',
  commercial: 'Commercial',
  lecture_seule: 'Lecture seule',
};

