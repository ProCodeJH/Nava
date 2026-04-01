import { saveErrorLog } from './watchdog-log.mjs';

const CRITICAL_PATTERNS = /SyntaxError|TypeError|ReferenceError|ENOENT|EACCES|EADDRINUSE|Cannot find module|Module not found|command not found|FATAL|Segmentation fault|killed/i;

const WARNING_PATTERNS = /warning:|deprecated|DeprecationWarning/i;

const TEST_COMMANDS = /vitest|playwright|npm\s+test|npx\s+test|jest|mocha/i;

const input = [];
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input.push(chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input.join(''));

    const command = data?.tool_input?.command ?? '';
    const exit_code = data?.tool_output?.exit_code;
    const stderr = data?.tool_output?.stderr ?? '';
    const stdout = data?.tool_output?.stdout ?? '';

    // No intervention on success or missing exit code
    if (exit_code === 0 || exit_code === undefined) {
      process.exit(0);
    }

    // Determine type
    const type = TEST_COMMANDS.test(command) ? 'test_fail' : 'bash_error';

    // Determine severity
    const combined = stderr + stdout;
    let severity;
    if (CRITICAL_PATTERNS.test(combined)) {
      severity = 'critical';
    } else if (WARNING_PATTERNS.test(combined)) {
      severity = 'warning';
    } else {
      severity = 'critical'; // unknown error = assume critical
    }

    // Extract error_message: first line of stderr, fallback to first error-like line from stdout
    let error_message = '';
    if (stderr) {
      error_message = stderr.split('\n')[0].trim();
    }
    if (!error_message && stdout) {
      const errorLine = stdout.split('\n').find(line =>
        /error|fail|fatal|exception/i.test(line)
      );
      error_message = (errorLine ?? stdout.split('\n')[0]).trim();
    }
    error_message = error_message.slice(0, 200);

    // Save log
    try {
      saveErrorLog({
        type,
        severity,
        command: command.slice(0, 500),
        exit_code,
        error_message,
        stderr_excerpt: stderr.slice(0, 500),
        auto_debug: severity === 'critical',
        project: process.cwd(),
      });
    } catch {
      // log failure is non-fatal
    }

    // Output systemMessage only for critical
    if (severity === 'critical') {
      let systemMessage;
      if (type === 'test_fail') {
        systemMessage =
          `[WATCHDOG:TEST_FAIL] 테스트 실패: ${error_message}\n` +
          `실패한 테스트를 분석하고 코드를 수정해라.\n` +
          `수정 후 테스트를 다시 실행해서 통과를 확인해라. 최대 3회 시도.`;
      } else {
        systemMessage =
          `[WATCHDOG:ERROR] ${error_message}\n` +
          `자동으로 원인을 분석하고 수정해라.`;
      }
      process.stdout.write(JSON.stringify({ systemMessage }) + '\n');
    }

    // warning -> log only, no output
    process.exit(0);
  } catch {
    // parse error or any failure -> silent exit
    process.exit(0);
  }
});
