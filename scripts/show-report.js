#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { spawn } = require('child_process')

function listArchiveRuns(archivesRoot) {
  if (!fs.existsSync(archivesRoot)) return []
  return fs
    .readdirSync(archivesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('AUDIT-'))
    .map((entry) => entry.name)
    .sort()
}

function getReportPath(repoRoot, runName) {
  return path.join(repoRoot, 'test-archives', runName, 'playwright-report')
}

function ask(rl, prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve))
}

async function main() {
  const repoRoot = process.cwd()
  const archivesRoot = path.join(repoRoot, 'test-archives')
  const runs = listArchiveRuns(archivesRoot)

  if (runs.length === 0) {
    console.error('No archived reports found in test-archives/.')
    process.exit(1)
  }

  console.log('Available archived reports:')
  runs.forEach((run, idx) => console.log(`  ${idx + 1}. ${run}`))

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const defaultIndex = runs.length
  const answer = await ask(
    rl,
    `Select report number [default ${defaultIndex} - latest]: `,
  )
  rl.close()

  const parsed = Number(answer.trim())
  const selectedIndex = Number.isInteger(parsed) && parsed >= 1 && parsed <= runs.length
    ? parsed
    : defaultIndex
  const selectedRun = runs[selectedIndex - 1]
  const selectedReportDir = getReportPath(repoRoot, selectedRun)

  if (!fs.existsSync(selectedReportDir)) {
    console.error(`Archived report not found for ${selectedRun}.`)
    process.exit(1)
  }

  console.log(`Opening archived report: ${selectedRun}`)
  const child = spawn('npx', ['playwright', 'show-report', selectedReportDir], {
    stdio: 'inherit',
    cwd: repoRoot,
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
