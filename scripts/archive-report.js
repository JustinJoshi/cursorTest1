#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function formatTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}-${hours}${minutes}`
}

function resolveUniqueAuditDir(baseDir, baseName) {
  let candidate = path.join(baseDir, baseName)
  let suffix = 1
  while (fs.existsSync(candidate)) {
    candidate = path.join(baseDir, `${baseName}-${suffix}`)
    suffix += 1
  }
  return candidate
}

function main() {
  const repoRoot = process.cwd()
  const reportDir = path.join(repoRoot, 'playwright-report')
  const archivesRoot = path.join(repoRoot, 'test-archives')

  if (!fs.existsSync(reportDir)) {
    console.error('No playwright-report directory found. Run tests first.')
    process.exit(1)
  }

  const cycleName = `AUDIT-${formatTimestamp()}`
  const auditDir = resolveUniqueAuditDir(archivesRoot, cycleName)
  const archiveReportDir = path.join(auditDir, 'playwright-report')

  fs.mkdirSync(auditDir, { recursive: true })
  fs.cpSync(reportDir, archiveReportDir, { recursive: true })

  console.log(`Archived report to: ${path.relative(repoRoot, archiveReportDir)}`)
}

main()
