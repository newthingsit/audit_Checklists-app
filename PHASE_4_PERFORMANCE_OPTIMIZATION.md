# Phase 4: Performance Optimization Checklist

## Web Application

### Code Splitting
- [ ] Implement React.lazy() for route-based code splitting
- [ ] Use dynamic imports for heavy components
- [ ] Monitor chunk sizes in build output

### Bundle Analysis
```bash
npm run build
npm install webpack-bundle-analyzer
# Add to vite.config.ts
```

### Lazy Loading Implementation
```javascript
// Before
import CategoryTabs from '@components/CategoryTabs';

// After
const CategoryTabs = React.lazy(() => import('@components/CategoryTabs'));
```

### Cache Strategy
- [ ] Implement service worker caching
- [ ] Set proper cache headers in deployment
- [ ] Cache-bust static assets on update

### Asset Optimization
- [ ] Compress images (use webp format)
- [ ] Minify CSS/JS (automatic with build)
- [ ] Remove unused dependencies

## Mobile Application

### Performance Monitoring
- [ ] Use React DevTools Profiler
- [ ] Monitor FPS during form navigation
- [ ] Check memory usage during photo upload

### Bundle Optimization
- [ ] Remove unused native modules
- [ ] Tree-shake development-only code
- [ ] Use Expo's managed updates

### Component Optimization
```javascript
// Memoize expensive components
export default React.memo(ChecklistItemsList, (prevProps, nextProps) => {
  return prevProps.items === nextProps.items;
});
```

### Image Optimization
- [ ] Use expo-image with caching
- [ ] Implement lazy loading for category photos
- [ ] Compress before upload

## Common Optimizations

### Metrics to Monitor
- [ ] Time to Interactive (TTI)
- [ ] First Contentful Paint (FCP)
- [ ] Cumulative Layout Shift (CLS)
- [ ] App startup time (mobile)

### Testing Performance
```bash
# Web
npm run build
npm run analyze

# Mobile
npm run build:web
npx expo export --platform ios/android
```

## Success Criteria
- ✅ Web bundle < 500KB (gzipped)
- ✅ Mobile app startup < 2 seconds
- ✅ TTI < 3 seconds
- ✅ Form navigation smooth (60 FPS)
