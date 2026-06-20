import type { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { WalletProvider } from '../context/WalletContext';
import { Toaster } from 'react-hot-toast';
import '../styles/globals.css';
// Bootstraps i18next on the client side (LanguageDetector, querystring, etc).
import '../lib/i18n';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider>
      <Component {...pageProps} />
      <Toaster position="bottom-right" />
    </WalletProvider>
  );
}

export default appWithTranslation(MyApp);
