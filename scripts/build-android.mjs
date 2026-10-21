import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const androidDir = path.resolve('android');
const wrapperJar = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.jar');
const localJdkRoot = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Temurin', 'jdk-21');
const localJdkName = localJdkRoot && existsSync(localJdkRoot)
  ? readdirSync(localJdkRoot, { withFileTypes: true }).find((entry) => entry.isDirectory() && entry.name.startsWith('jdk-21.'))?.name
  : undefined;
const javaHomeCandidates = [
  process.env.JAVA_HOME,
  localJdkName && path.join(localJdkRoot, localJdkName),
  process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Android', 'Android Studio', 'jbr'),
].filter(Boolean);
const javaHome = javaHomeCandidates.find((candidate) =>
  existsSync(path.join(candidate, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')),
);
const javaExecutable = javaHome
  ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  : 'java';
const sdkPath = process.env.ANDROID_HOME
  ?? process.env.ANDROID_SDK_ROOT
  ?? (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
const env = { ...process.env };

if (javaHome) env.JAVA_HOME = javaHome;
if (sdkPath && existsSync(sdkPath)) {
  env.ANDROID_HOME = sdkPath;
  env.ANDROID_SDK_ROOT = sdkPath;
}

const stopResult = spawnSync(
  javaExecutable,
  ['-classpath', wrapperJar, 'org.gradle.wrapper.GradleWrapperMain', '--stop'],
  { cwd: androidDir, env, stdio: 'inherit' },
);

if (stopResult.error) {
  console.error(`Could not stop existing Gradle daemons: ${stopResult.error.message}`);
  process.exit(1);
}

const result = spawnSync(
  javaExecutable,
  ['-classpath', wrapperJar, 'org.gradle.wrapper.GradleWrapperMain', 'assembleDebug'],
  { cwd: androidDir, env, stdio: 'inherit' },
);

if (result.error) {
  console.error(`Could not start Gradle: ${result.error.message}`);
  process.exit(1);
}

if (result.status === 0) {
  const generatedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (existsSync(generatedApk)) {
    const { copyFileSync, rmSync } = await import('node:fs');
    copyFileSync(generatedApk, path.resolve('TaxVault-debug.apk'));
    const stalePublicApk = path.resolve('public', 'app-debug.apk');
    if (existsSync(stalePublicApk)) {
      rmSync(stalePublicApk, { force: true });
    }
    console.log('Successfully copied fresh app-debug.apk to TaxVault-debug.apk (excluded from public assets)');
  }
}

process.exit(result.status ?? 1);
