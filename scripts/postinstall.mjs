/**
 * Shown after npm install @rolldate/core (skipped in CI).
 */
if (process.env.CI) process.exit(0)

const lines = [
  '',
  '  RollDate (@rolldate/core) installed!',
  '',
  '  Live demo  → https://www.rolldate.dev/',
  '  Docs       → https://www.rolldate.dev/docs',
  '  Star us    → https://github.com/Abramov-Front-end/rolldate-core',
  '',
  '  Enjoying it? A GitHub star helps others find a zero-dep date picker. Thank you!',
  ''
]

console.log(lines.join('\n'))
