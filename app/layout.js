import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ReduxProvider } from "@/lib/redux/ReduxProvider";
import StatusBarSetter from "@/components/StatusBarSetter";
import SplashScreen from "@/components/SplashScreen";
import AdjustInitializer from "@/components/AdjustInitializer";

export const metadata = {
  title: "Jackson Rewards",
  description: "Jackson Rewards App",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Required for env(safe-area-inset-*) CSS variables to expose correct values
  // on edge-to-edge devices (Android 15+, iOS notch devices).
  viewportFit: "cover",
  // Makes dvh units shrink when the soft keyboard opens (Chromium M139+ / Android
  // WebView). Without this, 100dvh stays the full screen height even with keyboard
  // open, so a bottom-sheet at bottom:0 / max-height:100dvh gets hidden behind the
  // keyboard. With resizes-content, 100dvh = available space above the keyboard —
  // no JS keyboard-height tracking needed.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Verisoul SDK - Use sandbox bundle when NEXT_PUBLIC_VERISOUL_BASE_URL contains "sandbox", else prod. Project ID must match that environment. */}
        {process.env.NEXT_PUBLIC_VERISOUL_PROJECT_ID && (
          <script
            async
            src={
              process.env.NEXT_PUBLIC_VERISOUL_BASE_URL?.includes("sandbox")
                ? "https://js.verisoul.ai/sandbox/bundle.js"
                : "https://js.verisoul.ai/prod/bundle.js"
            }
            verisoul-project-id={process.env.NEXT_PUBLIC_VERISOUL_PROJECT_ID}
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(e){if(e.Verisoul)return;const r=[],t={},o=new Proxy(t,{get:(e,o)=>o in t?t[o]:(...e)=>new Promise(((t,n)=>r.push([o,e,t,n]))),set:(e,r,o)=>(t[r]=o,!0)});e.Verisoul=o;const n=()=>{Object.keys(t).length&&r.splice(0).forEach((([e,r,o,n])=>{try{Promise.resolve(t[e](...r)).then(o,n)}catch(e){n(e)}}))},c=document.querySelector("script[verisoul-project-id]"),s=()=>r.splice(0).forEach((([,,,e])=>e(new Error("Failed to load Verisoul SDK"))));if(!c)return void s();c.addEventListener("load",n,{once:!0}),c.addEventListener("error",(()=>{clearInterval(i),s()}),{once:!0});const i=setInterval((()=>{Object.keys(t).length&&(clearInterval(i),n())}),40)}(window);`,
          }}
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Hide scrollbars completely on Android WebView */
            * {
              -ms-overflow-style: none !important;
              scrollbar-width: none !important;
            }
            *::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
              background: transparent !important;
            }
            *::-webkit-scrollbar-track {
              display: none !important;
              background: transparent !important;
              width: 0 !important;
              height: 0 !important;
            }
            *::-webkit-scrollbar-thumb {
              display: none !important;
              background: transparent !important;
              width: 0 !important;
              height: 0 !important;
            }
            *::-webkit-scrollbar-button {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            *::-webkit-scrollbar-corner {
              display: none !important;
              background: transparent !important;
            }
            html, body {
              -ms-overflow-style: none !important;
              scrollbar-width: none !important;
              overflow-x: hidden !important;
              overflow-y: auto !important;
              overscroll-behavior: none !important;
              overscroll-behavior-y: none !important;
              overscroll-behavior-x: none !important;
              background-color: #000000 !important;
              touch-action: pan-y !important;
            }
            html::-webkit-scrollbar, body::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
              background: transparent !important;
            }
          `,
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden overflow-y-auto">
        <SplashScreen>
          <ReduxProvider>
            <AuthProvider>
              <AdjustInitializer />
              <StatusBarSetter />
              {children}
            </AuthProvider>
          </ReduxProvider>
        </SplashScreen>
      </body>
    </html>
  );
}
