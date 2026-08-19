export function normalizeCommand(cmd: string): string {
  return cmd
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['"]/g, '"')
    .replace(/^git switch -c\b/, "git checkout -b")
    .replace(/^git switch\b/, "git checkout");
}

export function getCommandDoneFlags(
  commands: string[],
  log: string[],
): boolean[] {
  let logPointer = 0;

  return commands.map((required) => {
    const target = normalizeCommand(required);
    for (let i = logPointer; i < log.length; i++) {
      if (normalizeCommand(log[i]!) === target) {
        logPointer = i + 1;
        return true;
      }
    }
    return false;
  });
}
