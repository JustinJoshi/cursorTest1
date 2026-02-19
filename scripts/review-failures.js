#!/usr/bin/env node
'use strict'

/**
 * Playwright failure reviewer
 *
 * Reads test-results.json (produced by the JSON reporter) and/or the
 * test-results/ artifact directories, then either walks you through
 * each failure interactively or writes all AI prompts to a single file.
 *
 * Usage:
 *   node scripts/review-failures.js           # interactive, one-by-one
 *   node scripts/review-failures.js --all     # write ai-review/<timestamp>.md
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const ROOT = path.join(__dirname, '..')
const RESULTS_DIR = path.join(ROOT, 'test-results')
const RESULTS_JSON = path.join(ROOT, 'test-results.json')
const E2E_DIR = path.join(ROOT, 'e2e')
const OUTPUT_DIR = path.join(ROOT, 'ai-review')

const MODE = process.argv.includes('--all') ? 'all' : 'interactive'

// ─── JSON report parsing ──────────────────────────────────────────────────────

function collectFailuresFromJSON(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  const failures = []

  function walkSuites(suites, inheritedFile) {
    for (const suite of suites || []) {
      const file = suite.file || inheritedFile
      walkSuites(suite.suites, file)

      for (const spec of suite.specs || []) {
        if (spec.ok) continue

        for (const test of spec.tests || []) {
          for (const result of test.results || []) {
            if (result.status !== 'failed' && result.status !== 'timedOut') continue

            const attachmentDir = resolveAttachmentDir(result.attachments)

            failures.push({
              title: spec.title,
              file: file ? path.resolve(ROOT, file) : null,
              error: result.error || null,
              status: result.status,
              duration: result.duration,
              attachmentDir,
              pageSnapshot: loadSnapshot(attachmentDir),
              screenshots: listScreenshots(attachmentDir),
            })
          }
        }
      }
    }
  }

  walkSuites(data.suites, null)
  return failures
}

function resolveAttachmentDir(attachments) {
  if (!attachments?.length) return null
  for (const att of attachments) {
    if (att.path) return path.dirname(att.path)
  }
  return null
}

// ─── Fallback: scan test-results/ directory ───────────────────────────────────

function collectFailuresFromDir() {
  if (!fs.existsSync(RESULTS_DIR)) return []

  return fs
    .readdirSync(RESULTS_DIR)
    .filter(name => {
      const full = path.join(RESULTS_DIR, name)
      return fs.statSync(full).isDirectory() && name !== 'chromium'
    })
    .map(name => {
      const dirPath = path.join(RESULTS_DIR, name)
      // Guess spec file from the leading segment of the directory name
      const specBase = name.split('-')[0]
      const specFile = path.join(E2E_DIR, `${specBase}.spec.ts`)

      // Human-readable title: strip trailing "-chromium" and convert dashes
      const title = name.replace(/-chromium$/, '').replace(/-/g, ' ')

      return {
        title,
        file: fs.existsSync(specFile) ? specFile : null,
        error: null,
        status: 'failed',
        attachmentDir: dirPath,
        pageSnapshot: loadSnapshot(dirPath),
        screenshots: listScreenshots(dirPath),
      }
    })
}

// ─── Artifact helpers ─────────────────────────────────────────────────────────

function loadSnapshot(dir) {
  if (!dir) return null
  const f = path.join(dir, 'error-context.md')
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
}

function listScreenshots(dir) {
  if (!dir || !fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.png'))
    .map(f => path.join(dir, f))
}

// ─── Test code extraction ─────────────────────────────────────────────────────

function extractTestCode(specFile, testTitle) {
  if (!specFile || !fs.existsSync(specFile)) return null

  const src = fs.readFileSync(specFile, 'utf8')
  const lines = src.split('\n')

  // Strip common ID prefix like "TEAM-01: " so we can also match without it
  const shortTitle = testTitle.replace(/^[A-Z]+-\d+:\s*/, '')

  let startLine = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const hasTitle =
      line.includes(`'${testTitle}'`) ||
      line.includes(`"${testTitle}"`) ||
      line.includes(`'${shortTitle}'`) ||
      line.includes(`"${shortTitle}"`)
    if (hasTitle && /\btest\s*\(/.test(line)) {
      startLine = i
      break
    }
  }

  if (startLine === -1) return null

  let braceCount = 0
  let started = false
  const block = []

  for (let i = startLine; i < lines.length; i++) {
    block.push(lines[i])
    for (const ch of lines[i]) {
      if (ch === '{') { braceCount++; started = true }
      if (ch === '}') braceCount--
    }
    if (started && braceCount === 0) break
    if (block.length > 80) break // safety
  }

  return block.join('\n')
}

// ─── Prompt formatter ─────────────────────────────────────────────────────────

function buildPrompt(failure, index, total) {
  const lines = []
  const rel = failure.file ? path.relative(ROOT, failure.file) : 'unknown'

  lines.push(`# Playwright Failure [${index}/${total}]: ${failure.title}`)
  lines.push('')
  lines.push(`**Spec file:** \`${rel}\``)
  if (failure.screenshots.length) {
    lines.push(`**Screenshots:** ${failure.screenshots.map(s => path.relative(ROOT, s)).join(', ')}`)
  }
  lines.push('')

  if (failure.error) {
    lines.push('## Error')
    lines.push('```')
    const msg = (failure.error.message || String(failure.error)).trimEnd()
    lines.push(msg)
    if (failure.error.stack && !msg.includes(failure.error.stack.split('\n')[0])) {
      lines.push('')
      lines.push(failure.error.stack.trimEnd())
    }
    lines.push('```')
    lines.push('')
  }

  const testCode = extractTestCode(failure.file, failure.title)
  if (testCode) {
    lines.push('## Test Code')
    lines.push('```typescript')
    lines.push(testCode)
    lines.push('```')
    lines.push('')
  }

  if (failure.pageSnapshot) {
    lines.push('## Page State at Failure (Playwright ARIA snapshot)')
    lines.push(failure.pageSnapshot.trimEnd())
    lines.push('')
  }

  lines.push('---')
  lines.push('**Please analyze this Playwright test failure and:**')
  lines.push('1. Identify the root cause')
  lines.push('2. Determine whether this is a test bug or an application bug')
  lines.push('3. Provide a concrete fix with code')

  return lines.join('\n')
}

// ─── Interactive mode ─────────────────────────────────────────────────────────

async function interactiveMode(failures) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const ask = q => new Promise(res => rl.question(q, res))

  console.log(`\n  Found ${failures.length} failed test(s)\n`)

  for (let i = 0; i < failures.length; i++) {
    const f = failures[i]
    const num = `[${i + 1}/${failures.length}]`

    console.log('\n' + '─'.repeat(64))
    console.log(`${num} ${f.title}`)
    console.log('─'.repeat(64))

    if (f.error?.message) {
      const preview = f.error.message.split('\n').slice(0, 6).join('\n')
      console.log(`\nError:\n${preview}`)
    }

    if (f.file) {
      console.log(`\nSpec: ${path.relative(ROOT, f.file)}`)
    }

    if (f.screenshots.length) {
      console.log(`Screenshots: ${f.screenshots.map(s => path.relative(ROOT, s)).join(', ')}`)
    }

    console.log('\nOptions:  [Enter] show AI prompt   [s] skip   [q] quit')
    const ans = (await ask('> ')).trim().toLowerCase()

    if (ans === 'q') { console.log('\nExiting.'); break }

    if (ans !== 's') {
      const prompt = buildPrompt(f, i + 1, failures.length)
      console.log('\n' + '═'.repeat(64))
      console.log('PASTE THIS INTO CURSOR AI CHAT (Ctrl+L):')
      console.log('═'.repeat(64) + '\n')
      console.log(prompt)
      console.log('\n' + '═'.repeat(64))

      if (i < failures.length - 1) {
        await ask('\nPress Enter to continue...')
      }
    }
  }

  rl.close()
  console.log('\nReview complete.\n')
}

// ─── Batch --all mode ─────────────────────────────────────────────────────────

function allMode(failures) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputFile = path.join(OUTPUT_DIR, `failures-${timestamp}.md`)

  const header = [
    `# Playwright Test Failures`,
    `Generated: ${new Date().toLocaleString()}`,
    `Total failures: ${failures.length}`,
    '',
    '---',
  ].join('\n')

  const sections = failures.map((f, i) => buildPrompt(f, i + 1, failures.length))

  fs.writeFileSync(outputFile, [header, ...sections].join('\n\n'))

  const rel = path.relative(ROOT, outputFile)
  console.log(`\nAI review written to: ${rel}`)
  console.log(`Open it in Cursor, then use Ctrl+L (AI chat) to analyze each section.\n`)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  let failures

  if (fs.existsSync(RESULTS_JSON)) {
    failures = collectFailuresFromJSON(RESULTS_JSON)
    if (failures.length) {
      console.log(`Reading from test-results.json — ${failures.length} failure(s) found.`)
    }
  }

  if (!failures?.length) {
    if (fs.existsSync(RESULTS_JSON)) {
      console.log('No failures in test-results.json (all tests passed?).')
    } else {
      console.log('No test-results.json found — falling back to test-results/ directory.')
      console.log('Re-run tests to get full error details (the JSON reporter is now configured).\n')
    }
    failures = collectFailuresFromDir()
  }

  if (!failures.length) {
    console.log('No test failures found.')
    return
  }

  if (MODE === 'all') {
    allMode(failures)
  } else {
    await interactiveMode(failures)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
