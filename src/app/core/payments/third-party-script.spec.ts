import { loadScript, resetScriptCache } from './third-party-script';

describe('loadScript', () => {
  afterEach(() => {
    document.head.querySelectorAll('script').forEach((script) => script.remove());
    resetScriptCache();
  });

  it('adds one script per address and resolves when it runs', async () => {
    const first = loadScript(document, 'https://js.example/a.js');
    const second = loadScript(document, 'https://js.example/a.js');
    expect(document.head.querySelectorAll('script')).toHaveLength(1);

    document.head.querySelector('script')?.dispatchEvent(new Event('load'));
    await expect(Promise.all([first, second])).resolves.toBeDefined();
  });

  it('forgets a failed load so a retry adds the script again', async () => {
    const failed = loadScript(document, 'https://js.example/b.js');
    document.head.querySelector('script')?.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('script_failed');
    expect(document.head.querySelectorAll('script')).toHaveLength(0);

    void loadScript(document, 'https://js.example/b.js');
    expect(document.head.querySelectorAll('script')).toHaveLength(1);
  });
});
