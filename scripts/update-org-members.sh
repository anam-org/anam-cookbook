#!/bin/bash
# Fetches anam-org GitHub members and updates lib/organization.ts

set -e

MEMBERS=$(gh api /orgs/anam-org/members --jq '.[].login' | sort | tr '[:upper:]' '[:lower:]')

if [ -z "$MEMBERS" ]; then
  echo "Error: Could not fetch org members. Make sure you're authenticated with gh."
  exit 1
fi

# Build the Set entries
ENTRIES=""
for member in $MEMBERS; do
  ENTRIES="$ENTRIES  '$member',\n"
done

# Write the file
cat > lib/organization.ts << EOF
// Members of anam-org GitHub organization
// To update: pnpm update-org-members
export const orgMembers = new Set([
$(echo -e "$ENTRIES" | sed '$ s/,$//')
]);

export function isOrgMember(github?: string): boolean {
  if (!github) return false;
  return orgMembers.has(github.toLowerCase());
}
EOF

echo "Updated lib/organization.ts with $(echo "$MEMBERS" | wc -l | tr -d ' ') members"
