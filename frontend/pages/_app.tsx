import type { AppProps } from 'next/app';

import { StoreProvider } from '../lib/store';

import '../styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  return (
    <StoreProvider>
      <Component {...pageProps} />
    </StoreProvider>
  );
}

export default App;
