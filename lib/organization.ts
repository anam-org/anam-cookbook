// Members of anam-org GitHub organization
// To update: pnpm update-org-members
export const orgMembers = new Set([
  'a-aitken',
  'ao-anam',
  'bc-anam',
  'bnogas',
  'cb-anam',
  'danielgafni',
  'ema952',
  'jd-anam',
  'peterroelants',
  'robbie-anam',
  'rwe-101',
  'sebvanleuven',
  'smidge',
  'sr-anam',
]);

export function isOrgMember(github?: string): boolean {
  if (!github) return false;
  return orgMembers.has(github.toLowerCase());
}
