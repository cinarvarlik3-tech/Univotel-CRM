/**
 * Custom Document — global font loading for all pages.
 */
import { Head, Html, Main, NextScript } from 'next/document';

/**
 * Renders the HTML document shell with Google Fonts preconnect.
 * @returns Document element with font links.
 */
export default function Document() {
  return (
    <Html lang="tr">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Poppins:wght@700&family=JetBrains+Mono&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
