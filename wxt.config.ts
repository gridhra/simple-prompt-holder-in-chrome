import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Simple Prompt Holder',
    description: '頻用プロンプトをシンプルに管理・利用するためのChrome拡張',
    permissions: ['storage', 'clipboardWrite'],
    // default_popup は置かない: action.onClicked を background で受けるため
    action: {
      default_title: 'Toggle Prompt Holder',
    },
    commands: {
      'toggle-overlay': {
        suggested_key: {
          default: 'Alt+Shift+P',
        },
        description: 'Toggle the prompt holder overlay',
      },
    },
  },
});
