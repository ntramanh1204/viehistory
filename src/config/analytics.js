// filepath: d:\workspace\code\viehistory\src\config\analytics.js
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initGoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    console.warn('⚠️ Google Analytics Measurement ID not found');
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
  
  console.log('✅ Google Analytics initialized');
}

// Debug function để kiểm tra
export function checkGAStatus() {
  console.log({
    'GA Measurement ID exists': !!import.meta.env.VITE_GA_MEASUREMENT_ID,
    'gtag function exists': typeof window.gtag === 'function',
    'dataLayer exists': Array.isArray(window.dataLayer),
    'GA script loaded': !!document.querySelector('script[src*="googletagmanager.com"]')
  });
}