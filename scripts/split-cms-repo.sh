#!/usr/bin/env bash
# Extracts cms/ (with its history) into a local branch that can become its own repository.
#   scripts/split-cms-repo.sh [branch]            # default branch: cms-standalone
# Then, from the new empty repo (e.g. Desertica/desertica-cms):
#   git push git@github.com:Desertica/desertica-cms.git cms-standalone:main
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
branch="${1:-cms-standalone}"

if [ -n "$(git status --porcelain -- cms)" ]; then
  echo "cms/ has uncommitted changes; commit them first." >&2
  exit 1
fi

git subtree split --prefix=cms --branch "$branch"
echo
echo "Branch '$branch' holds cms/ as the repository root ($(git rev-list --count "$branch") commits)."
echo "Push it with: git push <new-repo-url> $branch:main"
