import { defineBackground } from '#imports';
import { SPH_TOGGLE } from '@/src/messages';

export default defineBackground(() => {
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-overlay') {
      sendToggleToActiveTab();
    }
  });

  chrome.action.onClicked.addListener((tab) => {
    if (tab.id !== undefined) {
      sendToggle(tab.id);
    }
  });

  async function sendToggleToActiveTab() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id !== undefined) {
      sendToggle(tab.id);
    }
  }

  function sendToggle(tabId: number) {
    // content script 未注入のページ (chrome:// 等) では失敗するが無視してよい
    chrome.tabs.sendMessage(tabId, { type: SPH_TOGGLE }).catch(() => {});
  }
});
