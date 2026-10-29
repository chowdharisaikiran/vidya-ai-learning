/**
 * VIDYA Platform: Centralized Subject & Weak-Subject Normalization & Demo Assignment Utility
 * Grounded in the institution's verified `subjects` table (CSE-DS Department).
 */

export const VALID_INSTITUTION_SUBJECTS = [
  'Python Programming',
  'Database Management Systems',
  'Machine Learning',
  'Data Structures',
  'Statistics',
  'Computer Networks',
  'Web Technologies',
  'Artificial Intelligence',
] as const;

export type ValidInstitutionSubject = typeof VALID_INSTITUTION_SUBJECTS[number];

/**
 * Normalizes and validates a weak subject string.
 * Returns 'Not assessed' if missing, null, unassigned, or invalid.
 */
export function normalizeWeakSubject(rawSubject?: string | null): string {
  if (!rawSubject || typeof rawSubject !== 'string') {
    return 'Not assessed';
  }

  const clean = rawSubject.trim();
  if (
    !clean ||
    clean.toLowerCase() === 'none' ||
    clean.toLowerCase() === 'null' ||
    clean.toLowerCase() === 'undefined' ||
    clean.toLowerCase() === 'not assessed' ||
    clean.toLowerCase() === 'n/a' ||
    clean.toLowerCase() === 'unassigned' ||
    clean.toLowerCase() === 'pending'
  ) {
    return 'Not assessed';
  }

  const matched = VALID_INSTITUTION_SUBJECTS.find(
    (subj) => subj.toLowerCase() === clean.toLowerCase()
  );

  return matched || 'Not assessed';
}

/**
 * Deterministically computes a demo-assigned weak subject using stable student ID and valid quiz score.
 * Marked as a demo estimate, not a genuine academic finding.
 */
export function getDemoWeakSubject(
  studentId: string | number,
  quizScore?: number | null
): { subject: string; label: string } {
  if (quizScore === undefined || quizScore === null || isNaN(Number(quizScore))) {
    return { subject: 'Not assessed', label: 'Not assessed' };
  }

  const rawIdStr = String(studentId || '1');
  const numId =
    parseInt(rawIdStr.replace(/\D/g, ''), 10) ||
    rawIdStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const index = Math.abs(numId + Math.floor(Number(quizScore))) % VALID_INSTITUTION_SUBJECTS.length;
  return {
    subject: VALID_INSTITUTION_SUBJECTS[index],
    label: 'Demo-assigned weak subject',
  };
}

/**
 * Checks if a subject string is a valid institution subject.
 */
export function isValidInstitutionSubject(subject: string): boolean {
  if (!subject) return false;
  return VALID_INSTITUTION_SUBJECTS.some(
    (s) => s.toLowerCase() === subject.trim().toLowerCase()
  );
}
