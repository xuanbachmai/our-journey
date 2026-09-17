/**
 * Small HTML dialogs for text entry (pairing codes, notes, answers). Phaser text
 * objects cannot open the phone keyboard, so these live in the DOM above the canvas.
 */
export interface PromptOptions {
  title: string;
  placeholder?: string;
  initial?: string;
  multiline?: boolean;
  maxLength?: number;
  okLabel?: string;
  cancelLabel?: string;
  /** Uppercase + strip spaces (for codes). */
  code?: boolean;
  type?: 'text' | 'email';
}

const STYLE = `
.hh-dim{position:fixed;inset:0;background:rgba(42,26,47,.55);display:flex;align-items:center;justify-content:center;z-index:50;font-family:'Press Start 2P',monospace}
.hh-box{background:#fff4dc;border:3px solid #4a2a3f;box-shadow:0 4px 0 #4a2a3f;padding:14px;width:min(92vw,420px);color:#4a2a3f}
.hh-title{font-size:12px;margin:0 0 10px;line-height:1.5}
.hh-input{width:100%;box-sizing:border-box;font-family:inherit;font-size:14px;padding:10px;border:2px solid #4a2a3f;background:#fff;color:#4a2a3f;outline:none}
textarea.hh-input{height:110px;resize:none;font-size:12px;line-height:1.6}
.hh-row{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}
.hh-btn{font-family:inherit;font-size:11px;padding:10px 14px;border:2px solid #4a2a3f;box-shadow:0 3px 0 #4a2a3f;cursor:pointer;background:#e8dcc8;color:#4a2a3f}
.hh-btn.ok{background:#7de8c8}
.hh-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #4a2a3f}
`;

function ensureStyle() {
  if (document.getElementById('hh-style')) return;
  const s = document.createElement('style');
  s.id = 'hh-style';
  s.textContent = STYLE;
  document.head.appendChild(s);
}

export function promptText(opts: PromptOptions): Promise<string | null> {
  ensureStyle();
  return new Promise((resolve) => {
    const dim = document.createElement('div');
    dim.className = 'hh-dim';
    const box = document.createElement('div');
    box.className = 'hh-box';
    const title = document.createElement('p');
    title.className = 'hh-title';
    title.textContent = opts.title;
    const input = document.createElement(opts.multiline ? 'textarea' : 'input') as HTMLInputElement | HTMLTextAreaElement;
    input.className = 'hh-input';
    if (!opts.multiline) (input as HTMLInputElement).type = opts.type ?? 'text';
    input.placeholder = opts.placeholder ?? '';
    input.value = opts.initial ?? '';
    if (opts.maxLength) input.maxLength = opts.maxLength;
    if (opts.code) {
      input.autocapitalize = 'characters';
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      });
    }
    const row = document.createElement('div');
    row.className = 'hh-row';
    const cancel = document.createElement('button');
    cancel.className = 'hh-btn';
    cancel.textContent = opts.cancelLabel ?? 'Cancel';
    const ok = document.createElement('button');
    ok.className = 'hh-btn ok';
    ok.textContent = opts.okLabel ?? 'OK';
    row.append(cancel, ok);
    box.append(title, input, row);
    dim.appendChild(box);
    document.body.appendChild(dim);
    const done = (v: string | null) => {
      dim.remove();
      resolve(v);
    };
    cancel.onclick = () => done(null);
    ok.onclick = () => done(input.value.trim());
    input.addEventListener('keydown', (e: Event) => {
      const key = (e as KeyboardEvent).key;
      if (key === 'Enter' && !opts.multiline) done(input.value.trim());
      if (key === 'Escape') done(null);
      e.stopPropagation();
    });
    setTimeout(() => input.focus(), 50);
  });
}

export function confirmBox(title: string, okLabel = 'Yes', cancelLabel = 'No'): Promise<boolean> {
  ensureStyle();
  return new Promise((resolve) => {
    const dim = document.createElement('div');
    dim.className = 'hh-dim';
    const box = document.createElement('div');
    box.className = 'hh-box';
    const t = document.createElement('p');
    t.className = 'hh-title';
    t.textContent = title;
    const row = document.createElement('div');
    row.className = 'hh-row';
    const cancel = document.createElement('button');
    cancel.className = 'hh-btn';
    cancel.textContent = cancelLabel;
    const ok = document.createElement('button');
    ok.className = 'hh-btn ok';
    ok.textContent = okLabel;
    row.append(cancel, ok);
    box.append(t, row);
    dim.appendChild(box);
    document.body.appendChild(dim);
    cancel.onclick = () => {
      dim.remove();
      resolve(false);
    };
    ok.onclick = () => {
      dim.remove();
      resolve(true);
    };
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
