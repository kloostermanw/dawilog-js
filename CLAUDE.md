# This is the javascript packages for dawilog.

# Application group
This application belong to a group of dawilog applications

| name        | github                                      |                  | local port |
|-------------|---------------------------------------------|------------------|------------|
| dawilog     | https://github.com/kloostermanw/dawilog     | main application | 8084       |
| dawilog-php | https://github.com/kloostermanw/dawilog-php | php package      |            |
| dawilog-js  | https://github.com/kloostermanw/dawilog-js  | js package       |            |

## Git workflow

git-flow model: `master` is the release branch, `develop` is the integration branch, work merges through `release/*` branches and version tags (`vX.Y.Z`). `.gitrelease` configures the release tooling. Open PRs against `master`.

## Using GitHub
For questions about GitHub, use the gh tool Never mention Claude Code in PR descriptions, PR comments, or issue comments Do not include a "Test plan" section in PR descriptions

## Git
Never mention Claude Code in PR descriptions, PR comments, or issue comments
use /create-commit to create a commit message
use /create-pr to create a pr message
