export class Microphone {
  private active: boolean = false;

  public start(): void {
    this.active = true;
  }

  public stop(): void {
    this.active = false;
  }

  public isMuted(): boolean {
    return !this.active;
  }
}
