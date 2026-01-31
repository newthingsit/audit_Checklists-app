# Phase 4: Performance Optimization - Implementation Guide

## Web Application Optimization

### 1. Code Splitting Implementation

#### Route-Based Code Splitting
```typescript
// Before
import AuditForm from './pages/AuditForm';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';

// After - React.lazy()
const AuditForm = lazy(() => import('./pages/AuditForm'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));

// In Router:
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/audit" element={<AuditForm />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/reports" element={<Reports />} />
  </Routes>
</Suspense>
```

### 2. Component-Level Lazy Loading

```typescript
// Lazy load heavy components
const CategoryTabs = lazy(() => import('@components/CategoryTabs'));
const PhotoGallery = lazy(() => import('@components/PhotoGallery'));
const ReportViewer = lazy(() => import('@components/ReportViewer'));

// Usage with Suspense
<Suspense fallback={<Skeleton />}>
  <CategoryTabs categories={categories} />
</Suspense>
```

### 3. Bundle Analysis

```bash
# Install analyzer
npm install --save-dev webpack-bundle-analyzer vite-plugin-visualizer

# Update vite.config.ts
import { visualizer } from 'vite-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
};

# Generate report
npm run build
```

### 4. Tree Shaking & Unused Code Removal

```javascript
// Bad - imports entire library
import * as lodash from 'lodash';
const result = lodash.debounce(fn, 300);

// Good - named import (tree-shakeable)
import { debounce } from 'lodash-es';
const result = debounce(fn, 300);
```

### 5. Dynamic Imports for Heavy Libraries

```typescript
// For rarely used features
const generateReport = async () => {
  const { generatePDF } = await import('pdfkit');
  return generatePDF(data);
};

// For conditional loading
if (userPreference === 'advanced') {
  const { AdvancedCharts } = await import('@components/AdvancedCharts');
  return <AdvancedCharts />;
}
```

## Mobile Application Optimization

### 1. Image Optimization

```typescript
// Using expo-image with caching
import { Image } from 'expo-image';

<Image
  source={{ uri: photoUri }}
  placeholder="image.png"
  contentFit="cover"
  cachePolicy="memory-disk"
  style={{ width: 200, height: 200 }}
/>
```

### 2. Lazy Loading Lists

```typescript
// For large lists, use FlatList with optimizations
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ChecklistItem item={item} />}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  removeClippedSubviews
  ListEmptyComponent={<EmptyState />}
  onEndReached={handleLoadMore}
  onEndReachedThreshold={0.5}
/>
```

### 3. Memoization for Expensive Renders

```typescript
// Memoize components
export const ChecklistItem = memo(
  ({ item, onPress }: Props) => (
    <TouchableOpacity onPress={onPress}>
      <Text>{item.question}</Text>
    </TouchableOpacity>
  ),
  (prevProps, nextProps) => prevProps.item.id === nextProps.item.id
);

// Memoize callbacks
const handlePress = useCallback((itemId: string) => {
  updateResponse(itemId, 'Yes');
}, [updateResponse]);
```

### 4. Reduce Bundle Size

```bash
# Analyze bundle
npm install --save-dev @react-native-community/hooks
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output app.bundle

# Remove unused dependencies
npm prune --production
npm audit fix --production
```

## Common Optimizations

### 1. Caching Strategy

```typescript
// HTTP Caching
const fetchWithCache = async (url: string, cacheKey: string) => {
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;
  
  const response = await fetch(url);
  const data = await response.json();
  await saveToCache(cacheKey, data);
  return data;
};
```

### 2. Debouncing & Throttling

```typescript
import { debounce, throttle } from 'lodash-es';

// Debounce for search input
const handleSearch = debounce((query: string) => {
  searchAudits(query);
}, 300);

// Throttle for scroll events
const handleScroll = throttle((event) => {
  updateScrollPosition(event);
}, 100);
```

### 3. Virtual Scrolling

```typescript
// For very large lists
import { FixedSizeList as List } from 'react-window';

<List
  height={600}
  itemCount={1000}
  itemSize={35}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  )}
</List>
```

### 4. Service Worker Caching

```typescript
// Create public/service-worker.js
const CACHE_NAME = 'audit-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/main.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

## Performance Monitoring

### 1. Web Performance Metrics

```typescript
// Measure Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 2. Mobile Performance Monitoring

```typescript
// React Native performance
import { PerformanceMonitor } from 'react-native-performance';

PerformanceMonitor.start('form-render');
// ... render form
PerformanceMonitor.stop('form-render');
PerformanceMonitor.getMetrics();
```

## Optimization Checklist

### Web
- [ ] Code splitting implemented for routes
- [ ] Lazy loading for components
- [ ] Bundle analyzer setup complete
- [ ] Tree shaking verified
- [ ] Service worker configured
- [ ] Images optimized (webp format)
- [ ] CSS minified
- [ ] Unused dependencies removed
- [ ] Compression enabled (gzip/brotli)
- [ ] Performance metrics monitored

### Mobile
- [ ] Images cached with expo-image
- [ ] FlatList optimized for large lists
- [ ] Components memoized appropriately
- [ ] Bundle size analyzed
- [ ] Unused code removed
- [ ] Startup time < 2 seconds
- [ ] Memory usage optimized
- [ ] No memory leaks detected
- [ ] APK size < 50MB
- [ ] Performance profiled in Xcode/Android Studio

## Expected Results

### Before Optimization
- Web bundle size: 800KB+ (gzipped: 200KB+)
- Time to Interactive: 4-5 seconds
- Mobile startup: 3-4 seconds
- FPS during interactions: 45-50 FPS

### After Optimization
- Web bundle size: 500KB (gzipped: 120KB)
- Time to Interactive: 2-3 seconds
- Mobile startup: < 2 seconds
- FPS during interactions: 55-60 FPS

## Optimization Metrics

```
Metric                  Target    Current
─────────────────────────────────────────
Bundle Size (gzip)      < 120KB   150KB
TTI (Time to Interactive) < 3s    4.2s
FCP (First Contentful Paint) < 1.5s  2.1s
LCP (Largest Contentful Paint) < 2.5s  3.5s
Mobile Startup          < 2s      3.1s
FPS (Form Navigation)   > 55fps   48fps
Memory (Mobile)         < 150MB   180MB
```

## Tools Used

- **webpack-bundle-analyzer** - Bundle size analysis
- **vite-plugin-visualizer** - Visual bundle report
- **web-vitals** - Core Web Vitals measurement
- **react-window** - Virtual scrolling
- **expo-image** - Optimized image caching
- **React.lazy** - Code splitting
- **lodash-es** - Tree-shakeable utilities

---

**Status**: Phase 4 documentation complete - Ready for implementation
