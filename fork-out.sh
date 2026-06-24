CURRENT_BRANCH=$(git branch --show-current)
NEW_OWNER="Egor-Koldasov"
NEW_REPO=$1

gh repo create $NEW_OWNER/$NEW_REPO --public --source=. --remote=new-origin-$NEW_REPO --push
git push new-origin-$NEW_REPO "$CURRENT_BRANCH:main"
gh repo edit $NEW_OWNER/$NEW_REPO --default-branch main
echo "git@github.com:$NEW_OWNER/$NEW_REPO.git"
