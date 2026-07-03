import { createRoot, type Root } from 'react-dom/client';
import { createShadowRootUi, defineContentScript } from '#imports';
import { isToggleMessage } from '@/src/messages';
import App from './App';
import './overlay.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    let visible = false;
    let root: Root | null = null;

    const ui = await createShadowRootUi(ctx, {
      name: 'sph-overlay',
      position: 'overlay',
      zIndex: 2147483646,
      onMount(container) {
        root = createRoot(container);
        root.render(<App onClose={hide} />);
        return root;
      },
      onRemove() {
        root?.unmount();
        root = null;
      },
    });

    function show() {
      if (!visible) {
        ui.mount();
        visible = true;
      }
    }

    function hide() {
      if (visible) {
        ui.remove();
        visible = false;
      }
    }

    function toggle() {
      if (visible) {
        hide();
      } else {
        show();
      }
    }

    // (1)(2) background 経由 (chrome.commands ショートカット / ツールバーアイコン)
    chrome.runtime.onMessage.addListener((msg: unknown) => {
      if (isToggleMessage(msg)) {
        toggle();
      }
    });

    // (3) in-page keydown: Alt+Shift+P。
    // e.code 判定 (mac の Option+Shift は e.key を別文字にするため)。
    // isTrusted を見ない = 合成 KeyboardEvent でも発火する (自動テスト用)。
    ctx.addEventListener(
      window,
      'keydown',
      (e) => {
        if (e.code === 'KeyP' && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          toggle();
        }
      },
      { capture: true },
    );

    // (4) 自動化・検証用フック: window.dispatchEvent(new CustomEvent('sph:toggle'))
    ctx.addEventListener(window as unknown as EventTarget, 'sph:toggle', () => {
      toggle();
    });
  },
});
