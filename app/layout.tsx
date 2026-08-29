import './globals.css';
import type {Metadata} from 'next';
export const metadata:Metadata={title:'Bantu Beres Disiplin Pro',description:'Sistem manajemen disiplin sekolah modern'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
