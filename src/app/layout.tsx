import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import './globals.css';
import './public-demo.css';
export const metadata:Metadata={title:"Sales Call Copilot | Pixel AI Solutions",description:"Sales Call Copilot interactive workflow demo by Pixel AI Solutions.",icons:{icon:'/pixel-p.svg'}};
const NAV=[
  { href: "/", label: "Call library" },
  { href: "/coaching", label: "Coaching" },
  { href: "/risk", label: "Risk" },
  { href: "/calls/new", label: "Upload call ↗" },
];
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){
 const sample=(await headers()).get('x-pixel-sample')==='1';
 return <html lang="en"><body>{sample?children:<><header className="pxd pxd-brand"><a href="https://pixelaisolutions.com"><img src="/pixel-p.svg" width="25" height="40" alt=""/>Pixel AI Solutions</a><nav className="flex gap-4 flex-wrap">{NAV.map(x=><Link href={x.href} key={x.href}>{x.label}</Link>)}</nav></header><main className="max-w-5xl mx-auto px-6 py-8">{children}</main></>}</body></html>
}
