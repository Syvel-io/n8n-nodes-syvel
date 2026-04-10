# Commit convention

This project uses **[Gitmoji](https://gitmoji.dev)** for all commit messages.

## Format

```
<emoji> <short description>

[optional body]
```

**Examples**

```
✨ Add Check Domain operation
🐛 Fix domain stripping for https:// prefix
📝 Add use cases to README
✅ Add continueOnFail test coverage
👷 Add CI workflow
⬆️ Upgrade vitest to 1.5.0
🔖 Release 0.2.0
```

---

## Quick reference

| Emoji | When to use |
|---|---|
| 🎉 `:tada:` | Initial commit, start of project |
| ✨ `:sparkles:` | New feature or operation |
| 💥 `:boom:` | Breaking change |
| 🐛 `:bug:` | Bug fix |
| 🚑️ `:ambulance:` | Critical hotfix |
| 🩹 `:adhesive_bandage:` | Minor, non-critical fix |
| 📝 `:memo:` | Add or update documentation |
| ✅ `:white_check_mark:` | Add or update tests |
| ♻️ `:recycle:` | Refactor (no behaviour change) |
| 🔥 `:fire:` | Remove code or files |
| 🎨 `:art:` | Improve code structure or format |
| ⚡️ `:zap:` | Performance improvement |
| 🔒️ `:lock:` | Fix security issue |
| 🦺 `:safety_vest:` | Add or improve input validation |
| ➕ `:heavy_plus_sign:` | Add a dependency |
| ➖ `:heavy_minus_sign:` | Remove a dependency |
| ⬆️ `:arrow_up:` | Upgrade a dependency |
| ⬇️ `:arrow_down:` | Downgrade a dependency |
| 📌 `:pushpin:` | Pin a dependency to a specific version |
| 🔧 `:wrench:` | Add or update configuration (ESLint, Prettier, tsconfig…) |
| 🔨 `:hammer:` | Add or update build/dev scripts |
| 👷 `:construction_worker:` | Add or update CI/CD (GitHub Actions) |
| 💚 `:green_heart:` | Fix a broken CI build |
| 🙈 `:see_no_evil:` | Add or update `.gitignore` |
| 🏷️ `:label:` | Add or update TypeScript types |
| 🔖 `:bookmark:` | Version release (bump `package.json` + tag) |
| 🚨 `:rotating_light:` | Fix lint / compiler warnings |
| ✏️ `:pencil2:` | Fix a typo |
| ⏪️ `:rewind:` | Revert a commit |
| 🔀 `:twisted_rightwards_arrows:` | Merge branches |
| 🚧 `:construction:` | Work in progress (avoid merging) |
| 👽️ `:alien:` | Update code due to Syvel API changes |

---

## Release workflow

```bash
# 1. Bump version in package.json
npm version patch   # 0.1.0 → 0.1.1
npm version minor   # 0.1.0 → 0.2.0
npm version major   # 0.1.0 → 1.0.0

# 2. Commit
git add package.json
git commit -m "🔖 Release 0.2.0"

# 3. Push & create a GitHub Release tagged v0.2.0
#    → the publish workflow publishes to npm automatically
```
