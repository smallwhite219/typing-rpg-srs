/**
 * Manages an HTML input element overlaid on top of the generic PixiJS Canvas.
 */
export class HtmlInputHolder {
  private container: HTMLDivElement;
  private input: HTMLInputElement;

  constructor(
    type: 'text' | 'password',
    placeholder: string,
    x: number,
    y: number,
    width: number = 200,
    height: number = 40
  ) {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    // Offset standard center anchoring to match PIXI anchor.set(0.5) logic
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.transform = 'translate(-50%, -50%)';
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;

    this.input = document.createElement('input');
    this.input.type = type;
    this.input.placeholder = placeholder;
    this.input.style.width = '100%';
    this.input.style.height = '100%';
    this.input.style.boxSizing = 'border-box';
    this.input.style.fontSize = '18px';
    this.input.style.padding = '8px 12px';
    this.input.style.border = '2px solid #3b82f6';
    this.input.style.borderRadius = '8px';
    this.input.style.outline = 'none';
    this.input.style.backgroundColor = '#1e293b';
    this.input.style.color = '#f8fafc';
    this.input.style.fontFamily = 'monospace';

    this.input.addEventListener('focus', () => {
      this.input.style.borderColor = '#60a5fa';
      this.input.style.boxShadow = '0 0 8px rgba(96, 165, 250, 0.5)';
    });

    this.input.addEventListener('blur', () => {
      this.input.style.borderColor = '#3b82f6';
      this.input.style.boxShadow = 'none';
    });

    this.container.appendChild(this.input);
    document.getElementById('app')?.appendChild(this.container);
  }

  public get value(): string {
    return this.input.value;
  }

  public set value(val: string) {
    this.input.value = val;
  }

  public focus() {
    this.input.focus();
  }

  public show() {
    this.container.style.display = 'block';
  }

  public hide() {
    this.container.style.display = 'none';
  }

  public destroy() {
    this.container.remove();
  }
}
