export function normalizeCommand(cmd: string): string {
  return cmd
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['"]/g, '"')
    .replace(/^git switch -c\b/, "git checkout -b")
    .replace(/^git switch\b/, "git checkout");
}

export function commandsMatch(required: string, actual: string): boolean {
  const target = normalizeCommand(required);
  const entry = normalizeCommand(actual);
  if (target === entry) return true;

  if (!target.includes("<")) return false;

  const parts = target.split(/<[^>]+>/);
  let pattern = "^";
  for (let i = 0; i < parts.length; i++) {
    pattern += parts[i]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (i < parts.length - 1) pattern += "[a-z0-9]{4,}";
  }
  pattern += "$";
  return new RegExp(pattern).test(entry);
}

export function getCommandDoneFlags(
  commands: string[],
  log: string[],
): boolean[] {
  let logPointer = 0;

  return commands.map((required) => {
    for (let i = logPointer; i < log.length; i++) {
      if (commandsMatch(required, log[i]!)) {
        logPointer = i + 1;
        return true;
      }
    }
    return false;
  });
}
