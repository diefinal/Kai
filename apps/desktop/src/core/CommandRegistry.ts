export interface RegisteredCommand {
  name: string;
  description: string;
  aliases: string[];
}

export class CommandRegistry {
  private commands: RegisteredCommand[] = [
    {
      name: 'Help',
      description: 'Display available commands',
      aliases: ['help', '?'],
    },
    {
      name: 'List Windows',
      description: 'List all open system windows',
      aliases: ['list windows', 'list-windows', 'windows'],
    },
    {
      name: 'Read Screen',
      description: 'Capture screen and perform OCR text recognition',
      aliases: ['read screen', 'read-screen', 'ocr'],
    },
    {
      name: 'Capture Screen',
      description: 'Capture active screen and save screenshot',
      aliases: ['capture screen', 'capture-screen', 'screenshot'],
    },
  ];

  getCommands(): ReadonlyArray<RegisteredCommand> {
    return this.commands;
  }

  isKnownCommand(input: string): boolean {
    const normalized = input.trim().toLowerCase();
    return this.commands.some(
      (cmd) =>
        cmd.name.toLowerCase() === normalized ||
        cmd.aliases.some((alias) => alias.toLowerCase() === normalized)
    );
  }

  getHelpText(): string {
    return [
      'Available Commands',
      '',
      '• Help',
      '• List Windows',
      '• Read Screen',
      '• Capture Screen',
    ].join('\n');
  }

  getUnknownCommandText(): string {
    return [
      'Unknown command.',
      '',
      'Type "help" to see available commands.',
    ].join('\n');
  }
}
 
