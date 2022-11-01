import execa = require("execa");

export async function commandStdoutOrNull(
  command: string
): Promise<string | null> {
  try {
    const result = await execa.command(command);
    return result.stdout;
  } catch {
    return null;
  }
}
