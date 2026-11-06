"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { CONSENT_EVENT, analyticsAllowed } from "@/lib/consent-cookies";

const GA_ID = "G-2PQPHJ8T3X";
const FB_ID = "991849460421419";

/**
 * Paths where measurement is never loaded, consent or not.
 *
 * These are the signed-in product. A radiologist writing a report is not an
 * audience being measured, and the Meta pixel would be sending the URL of
 * every page of a medical application to a third party. Nothing here needs
 * a marketing tag, and leaving them off is also two fewer third-party
 * scripts on the pages where speed matters most.
 */
const APP_PREFIXES = ["/dashboard", "/admin", "/org", "/remote-dictation", "/auth"];

function isAppPath(path: string): boolean {
  return APP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Google Analytics and the Meta pixel, loaded only where they are allowed.
 *
 * Two conditions, both required: the visitor said yes to non-essential
 * cookies, and the page is a public one. Previously these sat in the root
 * layout unconditionally, which meant they ran before the cookie banner had
 * even rendered and on every page of the signed-in app.
 *
 * Mounting is one-way on purpose. Consent granted mid-visit loads them
 * without a reload; consent that is later withdrawn cannot unload a script
 * that is already running, so the banner's reject path never loads them in
 * the first place and withdrawing takes effect on the next page view. That
 * is honest about what a browser can actually undo.
 *
 * The strategy is `afterInteractive` rather than `lazyOnload` for a reason
 * that only shows up when you click Accept: `lazyOnload` waits for the
 * window load event, which has already fired by the time anyone presses a
 * button, so the scripts were inserted and never ran. Consent is still only
 * read after hydration, so nothing here blocks the first paint.
 */
export function Analytics() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(analyticsAllowed());
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    // Another tab answering the banner counts too.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!allowed || isAppPath(pathname || "/")) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
      <Script id="fb-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${FB_ID}');
fbq('track', 'PageView');`}
      </Script>
    </>
  );
}
