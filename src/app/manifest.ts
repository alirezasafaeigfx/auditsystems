import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Audit Systems - چک کردن سایت',
    short_name: 'Audit IR',
    description: 'بررسی و ارزیابی سایت با گزارش قابل اجرا',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f7a66',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
