/**
 * @file scripts/runEmulators.mjs
 * @description Launches the Firebase Emulator Suite with a JDK 21+ guaranteed
 * on PATH, then hands off to `firebase emulators:start`.
 *
 * Why this wrapper exists: the Firestore emulator needs Java 21 or newer, and
 * firebase-tools resolves `java` from PATH only — it ignores JAVA_HOME. A
 * machine with an older JDK earlier on PATH (very common when several are
 * installed side by side) fails with "no longer supports Java version before
 * 21" even though a new enough JDK is sitting right there. This finds one and
 * puts it first on PATH for the emulator process only, leaving the system PATH
 * and any other JDK you depend on untouched.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIN_JAVA_VERSION = 21;

/** Directories that commonly hold side-by-side JDK installs. */
const SEARCH_DIRS =
  process.platform === "win32"
    ? [
        "C:\\Program Files\\Eclipse Adoptium",
        "C:\\Program Files\\Java",
        "C:\\Program Files\\Microsoft",
        "C:\\Program Files\\Zulu",
        "C:\\Program Files\\Amazon Corretto",
      ]
    : ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"];

const JAVA_BIN = process.platform === "win32" ? "java.exe" : "java";

/**
 * Returns the major version of a java executable, or null if it won't run.
 * `java -version` writes to stderr, and prints either "21.0.12" or "1.8.0_402".
 */
function javaMajorVersion(javaPath) {
  const result = spawnSync(javaPath, ["-version"], { encoding: "utf8" });
  if (result.error) return null;

  const output = `${result.stderr ?? ""}${result.stdout ?? ""}`;
  const match = output.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;

  const major = Number(match[1]);
  // Java 8 and earlier report as 1.8.x — the real major is the second number.
  return major === 1 ? Number(match[2]) : major;
}

/** Candidate java executables, best-guess order: PATH, JAVA_HOME, then install dirs. */
function* candidateJavaPaths() {
  yield { path: JAVA_BIN, home: null };

  if (process.env.JAVA_HOME) {
    yield { path: join(process.env.JAVA_HOME, "bin", JAVA_BIN), home: process.env.JAVA_HOME };
  }

  for (const dir of SEARCH_DIRS) {
    if (!existsSync(dir)) continue;

    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue; // Unreadable directory (permissions) — just skip it.
    }

    // Newest-looking first, so we don't settle for an older JDK that also qualifies.
    for (const entry of entries.sort().reverse()) {
      for (const home of [join(dir, entry), join(dir, entry, "Contents", "Home")]) {
        const javaPath = join(home, "bin", JAVA_BIN);
        if (existsSync(javaPath)) yield { path: javaPath, home };
      }
    }
  }
}

/** Finds a JDK meeting MIN_JAVA_VERSION. Returns its home dir, or null on PATH hit. */
function findUsableJdk() {
  for (const candidate of candidateJavaPaths()) {
    const version = javaMajorVersion(candidate.path);
    if (version !== null && version >= MIN_JAVA_VERSION) return candidate;
  }
  return undefined;
}

// ─── Launch ───────────────────────────────────────────────────────────────────

const jdk = findUsableJdk();

if (jdk === undefined) {
  console.error(
    `\nThe Firestore emulator needs Java ${MIN_JAVA_VERSION} or newer, and none was found.\n` +
      "Install one with:\n" +
      '  "%LOCALAPPDATA%\\Microsoft\\WindowsApps\\winget.exe" install EclipseAdoptium.Temurin.21.JDK\n',
  );
  process.exit(1);
}

const env = { ...process.env };

if (jdk.home) {
  env.PATH = `${join(jdk.home, "bin")}${process.platform === "win32" ? ";" : ":"}${env.PATH}`;
  env.JAVA_HOME = jdk.home;
  console.log(`Using JDK at ${jdk.home}`);
}

const child = spawn(
  "firebase",
  [
    "emulators:start",
    "--project",
    "demo-higgins-helper",
    "--only",
    "auth,firestore",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", env, shell: true },
);

child.on("exit", (code) => process.exit(code ?? 0));
