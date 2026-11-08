import { describe, expect, it } from 'vitest';
import { browserFamily, inAppBrowser, micHelp } from './info';

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.20.113 (iPhone14,5; iOS 17_4)',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-S908B Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]',
  whatsappAndroid: 'WhatsApp/2.24.8.80 Android/13 Device/samsung-SM-S908B',
  genericAndroidWebview: 'Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36',
  iosWebview: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
};

describe('in-app browser detection', () => {
  it('leaves real browsers alone', () => {
    for (const ua of [UA.iosSafari, UA.iosChrome, UA.androidChrome, UA.desktopChrome, UA.firefox, UA.edge]) expect(inAppBrowser(ua)).toBeNull();
  });
  it('spots apps that embed a browser', () => {
    expect(inAppBrowser(UA.instagramIos)).toBe('Instagram');
    expect(inAppBrowser(UA.facebookAndroid)).toBe('Facebook');
    expect(inAppBrowser(UA.whatsappAndroid)).toBe('WhatsApp');
  });
  it('spots anonymous webviews', () => {
    expect(inAppBrowser(UA.genericAndroidWebview)).toBe('an in-app browser');
    expect(inAppBrowser(UA.iosWebview)).toBe('an in-app browser');
  });
});

describe('browser family and mic help', () => {
  it('tells browsers apart', () => {
    expect(browserFamily(UA.iosSafari)).toBe('ios-safari');
    expect(browserFamily(UA.iosChrome)).toBe('ios-chrome');
    expect(browserFamily(UA.androidChrome)).toBe('android-chrome');
    expect(browserFamily(UA.desktopChrome)).toBe('chrome');
    expect(browserFamily(UA.firefox)).toBe('firefox');
    expect(browserFamily(UA.edge)).toBe('edge');
  });
  it('gives each browser its own steps', () => {
    const all = (['ios-safari', 'ios-chrome', 'android-chrome', 'chrome', 'firefox', 'safari', 'edge', 'other'] as const).map(micHelp);
    for (const steps of all) expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(micHelp('ios-safari').join(' ')).toMatch(/Settings/);
    expect(new Set(all.map((s) => s.join('|'))).size).toBeGreaterThan(5);
  });
});
