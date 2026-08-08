const PREVIEW_ENV_KEY_PATTERN = /(test[_-]?data|data[_-]?env|environment|preview[_-]?test|sandbox)/i;
const DEV_VALUE_PATTERN = /^(true|1|on|dev|test|sandbox)$/i;
const DEV_ENV_PATTERN = /(dev|test|sandbox)/i;

const getUrlMode = () => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const explicitMode = urlParams.get('base44_data_env');

  if (explicitMode === 'dev' || explicitMode === 'prod') {
    return explicitMode;
  }

  return null;
};

export function getRelevantPreviewEntries() {
  if (typeof window === 'undefined') return [];

  return Object.keys(window.localStorage)
    .sort()
    .map((key) => [key, window.localStorage.getItem(key)])
    .filter(([key]) => PREVIEW_ENV_KEY_PATTERN.test(key));
}

export function getPreviewDataMode() {
  const urlMode = getUrlMode();
  if (urlMode) return urlMode;

  const relevantEntries = getRelevantPreviewEntries();

  const hasExplicitTestToggle = relevantEntries.some(([key, value]) =>
    /(test[_-]?data|preview[_-]?test|sandbox)/i.test(key) && DEV_VALUE_PATTERN.test(String(value || ''))
  );

  const hasExplicitDevEnv = relevantEntries.some(([key, value]) =>
    /(data[_-]?env|environment)/i.test(key) && DEV_ENV_PATTERN.test(String(value || ''))
  );

  const storedExplicitMode = relevantEntries.find(([key]) => /(data[_-]?env|environment)/i.test(key))?.[1];
  if (storedExplicitMode === 'dev' || storedExplicitMode === 'prod') {
    return storedExplicitMode;
  }

  return hasExplicitTestToggle || hasExplicitDevEnv ? 'dev' : 'prod';
}

export function getPreviewDataSignature() {
  if (typeof window === 'undefined') return 'server';

  return JSON.stringify({
    href: window.location.href,
    mode: getPreviewDataMode(),
    relevantEntries: getRelevantPreviewEntries(),
  });
}