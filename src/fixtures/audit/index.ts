export type AuditFixture = {
  name: string;
  description: string;
  html: string;
  url: string;
  expectedScoreRange: [number, number];
  expectedFindings: string[];
  expectedCategories: string[];
};

export const goodWebsite: AuditFixture = {
  name: "good-website",
  description: "Well-optimized website with proper security, performance, and SEO",
  url: "https://example-good.com",
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Good Website - Optimized for Performance</title>
  <meta name="description" content="A well-optimized website with excellent performance and security.">
  <link rel="canonical" href="https://example-good.com">
  <meta property="og:title" content="Good Website">
  <meta property="og:description" content="A well-optimized website">
  <meta property="og:image" content="https://example-good.com/og-image.jpg">
  <link rel="stylesheet" href="/styles/main.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Good Website",
    "url": "https://example-good.com"
  }
  </script>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  <main>
    <h1>Welcome to Good Website</h1>
    <img src="/hero.webp" alt="Hero image of our product" width="1200" height="600" loading="eager">
    <img src="/feature1.webp" alt="Feature 1" width="800" height="400" loading="lazy">
    <img src="/feature2.webp" alt="Feature 2" width="800" height="400" loading="lazy">
    <form>
      <label for="email">Email</label>
      <input type="email" id="email" name="email">
      <button type="submit">Subscribe</button>
    </form>
  </main>
  <script src="/app.js" async></script>
</body>
</html>`,
  expectedScoreRange: [80, 100],
  expectedFindings: ["THIRD_PARTY_FONTS"],
  expectedCategories: ["RESILIENCE"],
};

export const averageWebsite: AuditFixture = {
  name: "average-website",
  description: "Website with some issues but generally functional",
  url: "https://example-average.com",
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Average Website</title>
  <meta name="description" content="An average website with some issues">
  <link rel="stylesheet" href="/styles.css">
  <script src="/analytics.js"></script>
  <script src="/widgets.js"></script>
  <script src="/tracking.js"></script>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
    </nav>
  </header>
  <main>
    <h1>Average Website</h1>
    <img src="/photo1.jpg">
    <img src="/photo2.jpg">
    <img src="/photo3.jpg">
    <img src="/photo4.jpg">
    <img src="/photo5.jpg">
    <img src="/photo6.jpg">
    <img src="/photo7.jpg">
    <img src="/photo8.jpg">
    <img src="/photo9.jpg">
    <img src="/photo10.jpg">
    <iframe src="https://www.youtube.com/embed/abc123"></iframe>
    <form>
      <input type="text" placeholder="Your name">
      <input type="email" placeholder="Your email">
      <button type="submit">Submit</button>
    </form>
  </main>
  <script src="/app.js"></script>
</body>
</html>`,
  expectedScoreRange: [30, 80],
  expectedFindings: [
    "IMAGES_MISSING_LAZY_LOADING",
    "SCRIPTS_MISSING_ASYNC_DEFER",
    "INPUT_MISSING_LABEL",
  ],
  expectedCategories: ["PERFORMANCE", "ACCESSIBILITY"],
};

export const badWebsite: AuditFixture = {
  name: "bad-website",
  description: "Website with critical issues across all categories",
  url: "https://example-bad.com",
  html: `<!DOCTYPE html>
<html>
<head>
  <title></title>
  <script src="http://insecure-cdn.com/tracker.js"></script>
  <script src="http://ads.example.com/popup.js"></script>
</head>
<body>
  <h1>Bad Website</h1>
  <img src="http://example.com/photo1.jpg">
  <img src="http://example.com/photo2.jpg">
  <img src="http://example.com/photo3.jpg">
  <img src="http://example.com/photo4.jpg">
  <img src="http://example.com/photo5.jpg">
  <img src="http://example.com/photo6.jpg">
  <img src="http://example.com/photo7.jpg">
  <img src="http://example.com/photo8.jpg">
  <img src="http://example.com/photo9.jpg">
  <img src="http://example.com/photo10.jpg">
  <img src="http://example.com/photo11.jpg">
  <form>
    <input type="text">
    <input type="email">
    <select>
      <option>Option 1</option>
    </select>
    <textarea></textarea>
    <button>Submit</button>
  </form>
  <iframe src="http://insecure-widget.com/chat"></iframe>
  <script src="http://insecure-cdn.com/analytics.js"></script>
</body>
</html>`,
  expectedScoreRange: [0, 30],
  expectedFindings: [
    "MIXED_CONTENT",
    "SEO_BASICS_MISSING",
    "IMAGES_MISSING_LAZY_LOADING",
    "INPUT_MISSING_LABEL",
    "IFRAMES_MISSING_LAZY_LOADING",
    "SCRIPTS_MISSING_ASYNC_DEFER",
    "THIRD_PARTY_CRITICAL_JS",
  ],
  expectedCategories: ["SECURITY", "SEO", "PERFORMANCE", "ACCESSIBILITY", "RESILIENCE"],
};

export const wordpressWebsite: AuditFixture = {
  name: "wordpress-website",
  description: "Typical WordPress site with common issues",
  url: "https://example-wp.com",
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WordPress Site</title>
  <meta name="description" content="A typical WordPress website">
  <link rel="stylesheet" href="/wp-content/themes/theme/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans&display=swap" rel="stylesheet">
  <script src="/wp-includes/js/jquery/jquery.min.js"></script>
  <script src="/wp-content/plugins/elementor/assets/js/frontend.js"></script>
  <script src="/wp-content/plugins/yoast-seo/js/frontend.js"></script>
  <script src="https://www.google-analytics.com/analytics.js" async></script>
  <script src="https://www.googletagmanager.com/gtag.js" async></script>
  <script src="https://connect.facebook.net/en_US/fbevents.js" async></script>
  <script src="https://snap.licdn.com/li.js" async></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "WordPress Site",
    "url": "https://example-wp.com"
  }
  </script>
</head>
<body class="home blog">
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/blog">Blog</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <article>
      <h1>Welcome to Our Blog</h1>
      <img src="/wp-content/uploads/2024/01/featured.jpg" alt="Featured image">
      <p>This is a sample blog post on our WordPress site.</p>
      <img src="/wp-content/uploads/2024/01/image1.jpg" alt="">
      <img src="/wp-content/uploads/2024/01/image2.jpg" alt="">
      <img src="/wp-content/uploads/2024/01/image3.jpg">
    </article>
    <aside>
      <h2>Categories</h2>
      <ul>
        <li><a href="/category/tech">Technology</a></li>
        <li><a href="/category/business">Business</a></li>
      </ul>
    </aside>
  </main>
  <footer>
    <p>&copy; 2024 WordPress Site</p>
  </footer>
  <script src="/wp-content/themes/theme/script.js"></script>
</body>
</html>`,
  expectedScoreRange: [30, 80],
  expectedFindings: [
    "THIRD_PARTY_FONTS",
    "IMAGES_MISSING_LAZY_LOADING",
    "IMG_MISSING_ALT",
  ],
  expectedCategories: ["RESILIENCE", "PERFORMANCE", "ACCESSIBILITY"],
};

export const ecommerceWebsite: AuditFixture = {
  name: "ecommerce-website",
  description: "E-commerce site with product pages and checkout",
  url: "https://example-shop.com",
  html: `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فروشگاه آنلاین - بهترین محصولات</title>
  <meta name="description" content="فروشگاه آنلاین با بهترین محصولات و قیمت‌ها">
  <link rel="canonical" href="https://example-shop.com">
  <meta property="og:title" content="فروشگاه آنلاین">
  <meta property="og:description" content="بهترین محصولات">
  <meta property="og:image" content="https://example-shop.com/og.jpg">
  <link rel="stylesheet" href="/css/main.css">
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600&display=swap" rel="stylesheet">
  <script src="/js/app.js" defer></script>
  <script src="https://www.google-analytics.com/analytics.js" async></script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "فروشگاه آنلاین",
    "url": "https://example-shop.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://example-shop.com/search?q={search_term_string}"
    }
  }
  </script>
</head>
<body>
  <header>
    <nav>
      <a href="/">خانه</a>
      <a href="/products">محصولات</a>
      <a href="/cart">سبد خرید</a>
    </nav>
  </header>
  <main>
    <h1>محصولات ویژه</h1>
    <div class="product-grid">
      <div class="product">
        <img src="/products/1.jpg" alt="محصول ۱" width="300" height="300" loading="lazy">
        <h2>محصول ۱</h2>
        <p>قیمت: ۱,۰۰۰,۰۰۰ تومان</p>
      </div>
      <div class="product">
        <img src="/products/2.jpg" alt="محصول ۲" width="300" height="300" loading="lazy">
        <h2>محصول ۲</h2>
        <p>قیمت: ۲,۰۰۰,۰۰۰ تومان</p>
      </div>
    </div>
    <form>
      <label for="search">جستجو</label>
      <input type="search" id="search" name="search" placeholder="جستجوی محصول...">
      <button type="submit">جستجو</button>
    </form>
  </main>
</body>
</html>`,
  expectedScoreRange: [70, 95],
  expectedFindings: ["THIRD_PARTY_FONTS"],
  expectedCategories: ["RESILIENCE"],
};

export const persianWebsite: AuditFixture = {
  name: "persian-website",
  description: "Persian/Farsi language website",
  url: "https://example-fa.com",
  html: `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>سایت فارسی - صفحه اصلی</title>
  <meta name="description" content="یک سایت فارسی با محتوای ایرانی">
  <link rel="canonical" href="https://example-fa.com">
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <header>
    <nav>
      <a href="/">خانه</a>
      <a href="/about">درباره ما</a>
    </nav>
  </header>
  <main>
    <h1>به سایت فارسی خوش آمدید</h1>
    <p>این یک سایت فارسی با محتوای ایرانی است.</p>
    <img src="/banner.jpg" alt="بنر سایت" width="1200" height="400">
  </main>
</body>
</html>`,
  expectedScoreRange: [60, 85],
  expectedFindings: ["THIRD_PARTY_FONTS"],
  expectedCategories: ["RESILIENCE"],
};

export const allFixtures: AuditFixture[] = [
  goodWebsite,
  averageWebsite,
  badWebsite,
  wordpressWebsite,
  ecommerceWebsite,
  persianWebsite,
];
