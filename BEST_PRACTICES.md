# 📚 Best Practices Guide - Audit Checklists App

## 🎯 Purpose
This guide establishes coding standards and best practices for the Audit Checklists application team during the modernization initiative (Phase 1-4).

---

## 📋 Table of Contents
1. [Project Structure](#project-structure)
2. [Naming Conventions](#naming-conventions)
3. [Code Quality](#code-quality)
4. [Git Workflow](#git-workflow)
5. [Testing Standards](#testing-standards)
6. [Documentation](#documentation)
7. [Performance](#performance)
8. [Security](#security)
9. [TypeScript Standards](#typescript-standards)
10. [React Best Practices](#react-best-practices)

---

## 🗂️ Project Structure

### Recommended Organization
```
audit-checklists-app/
├── mobile/
│   ├── src/
│   │   ├── screens/           # Screen components (one per file)
│   │   ├── components/        # Reusable components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   ├── context/          # React Context providers
│   │   ├── types/            # TypeScript types (if using TS)
│   │   ├── constants/        # App constants
│   │   └── services/         # API services
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── web/
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   ├── context/         # React Context
│   │   ├── types/           # TypeScript types
│   │   ├── constants/       # App constants
│   │   └── services/        # API services
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
│
├── shared/
│   ├── utils/               # Shared utility functions
│   ├── constants/           # Shared constants/enums
│   ├── types/              # Shared TypeScript types
│   └── services/           # Shared services (API client)
│
├── docs/                    # Documentation
└── README.md
```

### File Size Guidelines
| File Type | Max Size | If Exceeds | Action |
|-----------|----------|-----------|--------|
| Screen/Page Component | 1000 lines | Refactor | Split into sub-components |
| Utility File | 500 lines | Refactor | Split by concern |
| Hook File | 300 lines | Refactor | Extract smaller hooks |
| Test File | 500 lines | Refactor | Create test suites |

---

## 🏷️ Naming Conventions

### Files & Folders
```javascript
// Components: PascalCase.js
UserProfile.js
CategorySelector.js
AuditForm.js

// Utilities: camelCase.js
auditHelpers.js
formValidation.js
locationUtils.js

// Hooks: camelCase.js (prefix with 'use')
useAuditData.js
useLocationContext.js
useFormValidation.js

// Types/Constants: PascalCase.ts or camelCase.js
AuditConstants.ts
auditConstants.ts
UserRole.ts

// Tests: [Name].test.js
auditHelpers.test.js
useAuditData.test.js
AuditForm.test.js
```

### Variables & Functions
```javascript
// Components: PascalCase
function UserProfile() { }
const UserCard = () => { }

// Hooks: camelCase, prefix with 'use'
function useAuditData() { }
const useLocationTracking = () => { }

// Variables: camelCase
const userCount = 0;
const isAuditComplete = false;
let categoryList = [];

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const API_TIMEOUT_MS = 30000;
const DEFAULT_LOCATION_ACCURACY = 50; // meters

// Private functions: _camelCase or camelCase with leading underscore
function _calculateCompletion() { }
const _validateEmail = () => { }

// Enums: PascalCase
enum AuditStatus { PENDING, IN_PROGRESS, COMPLETED }
enum UserRole { ADMIN, AUDITOR, VIEWER }
```

### API & Data
```javascript
// API response fields: snake_case (from backend)
{
  audit_id: "123",
  audit_category: "SERVICE",
  created_at: "2024-01-01",
  updated_at: "2024-01-02"
}

// Frontend state: camelCase
const [auditId, setAuditId] = useState("");
const [auditCategory, setAuditCategory] = useState("");
const [createdAt, setCreatedAt] = useState(null);
```

---

## ✅ Code Quality

### Linting Rules
```json
{
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "no-var": "error",
    "prefer-const": "error",
    "eqeqeq": "error",
    "indent": ["error", 2],
    "quotes": ["error", "double"],
    "semi": ["error", "always"],
    "max-len": ["warn", 100],
    "complexity": ["warn", 10]
  }
}
```

### Code Complexity Guidelines

**Function Complexity (Cyclomatic)**:
- ✅ 1-5: Low complexity (good)
- ⚠️ 6-10: Medium complexity (needs review)
- ❌ 11+: High complexity (must refactor)

**Example - Refactor This**:
```javascript
// ❌ Too complex (11+ branches)
function validateAudit(audit) {
  if (!audit) return false;
  if (!audit.id) return false;
  if (!audit.category) return false;
  if (!audit.items) return false;
  if (audit.items.length === 0) return false;
  for (let item of audit.items) {
    if (!item.mark && !item.photo && !item.text) return false;
    if (item.mark && !["YES", "NO", "NA"].includes(item.mark)) return false;
  }
  if (audit.location && !audit.location.latitude) return false;
  if (audit.location && !audit.location.longitude) return false;
  return true;
}

// ✅ Refactored (low complexity)
function validateAudit(audit) {
  return validateAuditBasics(audit) && 
         validateAuditItems(audit.items) && 
         validateAuditLocation(audit.location);
}
```

### Code Review Checklist

Before committing, verify:

- [ ] **Naming**: Variables/functions clearly named
- [ ] **DRY**: No code duplication (< 10% duplication)
- [ ] **SOLID**: Functions have single responsibility
- [ ] **Comments**: Complex logic documented
- [ ] **Errors**: Error handling for all paths
- [ ] **Logging**: Debug logs for troubleshooting
- [ ] **Performance**: No obvious inefficiencies
- [ ] **Security**: No hardcoded secrets
- [ ] **Types**: TypeScript types properly defined
- [ ] **Tests**: Critical paths have tests

---

## 🔀 Git Workflow

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test addition/update
- `docs`: Documentation
- `chore`: Build/dependency updates
- `style`: Code style changes

**Examples**:
```bash
git commit -m "fix(audit): auto-select incomplete category on continue"
git commit -m "feat(forms): add TypeScript types to validation functions"
git commit -m "refactor(mobile): extract category logic to hook"
git commit -m "perf(web): optimize form re-renders with useMemo"
git commit -m "test(utils): add tests for auditHelpers"
git commit -m "docs: add Phase 1 implementation guide"
```

### Branch Naming
```bash
# Feature branch
feature/auto-category-selection
feature/typescript-migration

# Bug fix branch
bugfix/category-repetition
bugfix/location-permission-error

# Refactor branch
refactor/extract-components
refactor/reduce-duplication

# Documentation branch
docs/best-practices-guide
docs/deployment-checklist
```

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   git push -u origin feature/my-feature
   ```

2. **Commit regularly**
   ```bash
   git commit -m "feat: initial implementation"
   git commit -m "fix: address code review feedback"
   ```

3. **Before push, update from main**
   ```bash
   git fetch origin
   git rebase origin/master
   ```

4. **Create Pull Request**
   - Link to GitHub issue
   - Describe changes
   - Mention reviewers
   - Run tests before submitting

5. **Code Review Requirements**
   - [ ] At least 1 approval
   - [ ] No failing tests
   - [ ] No merge conflicts
   - [ ] Updated documentation

6. **Merge Strategy**
   - Use "Squash and merge" for feature branches
   - Use "Create a merge commit" for major releases

---

## 🧪 Testing Standards

### Test Coverage Targets

| Component Type | Coverage Target | Critical Paths |
|---|---|---|
| Shared utilities | 90%+ | All functions |
| UI Components | 60%+ | User interactions |
| Hooks | 80%+ | State changes |
| Services | 85%+ | API calls, errors |
| Pages/Screens | 50%+ | Main flows |

### Test File Organization
```javascript
// auditHelpers.test.js
describe("auditHelpers", () => {
  describe("calculateCategoryCompletionStatus", () => {
    it("should return 0% for empty items", () => { });
    it("should return 100% for all completed items", () => { });
    it("should handle mixed completion states", () => { });
  });

  describe("getFirstIncompleteCategory", () => {
    it("should return first incomplete category", () => { });
    it("should return null for empty array", () => { });
  });
});
```

### Test Example
```javascript
import { validateAuditItem } from "@shared/utils/formValidation";

describe("validateAuditItem", () => {
  it("should pass for valid item", () => {
    const item = {
      category: "SERVICE",
      mark: "YES",
      createdAt: new Date().toISOString()
    };
    const result = validateAuditItem(item);
    expect(result.isValid).toBe(true);
  });

  it("should fail for missing mark", () => {
    const item = { category: "SERVICE" };
    const result = validateAuditItem(item);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Mark is required");
  });

  it("should fail for invalid mark", () => {
    const item = { category: "SERVICE", mark: "MAYBE" };
    const result = validateAuditItem(item);
    expect(result.isValid).toBe(false);
  });
});
```

---

## 📖 Documentation

### Code Comments
```javascript
// ✅ Good: Explains WHY, not WHAT
// Using exponential backoff to avoid overwhelming the API
// First retry after 1s, then 2s, then 4s, etc.
const delay = Math.pow(2, retryCount) * 1000;

// ❌ Bad: Restates obvious code
// Increment retry count
retryCount++;

// ❌ Bad: Outdated comment
// This is a temporary fix (written in 2023)
if (bug) { workaround(); }
```

### JSDoc/TypeScript
```typescript
/**
 * Calculate the completion status for each category in an audit
 * @param {Array<string>} categories - List of audit categories
 * @param {Array<Object>} items - List of audit items
 * @returns {Object} Object with category name as key and completion status as value
 * 
 * @example
 * const status = calculateCategoryCompletionStatus(
 *   ["SERVICE", "COMPLIANCE"],
 *   [{ category: "SERVICE", mark: "YES" }]
 * );
 * // Returns: { SERVICE: { completed: 1, total: 1, isComplete: true } }
 */
export function calculateCategoryCompletionStatus(
  categories: string[],
  items: AuditItem[]
): Record<string, CategoryStatus> {
  // Implementation
}
```

### README Files

Every folder should have a README:

```markdown
# Shared Utilities

Reusable functions and types shared between mobile and web apps.

## Folder Structure

- `utils/` - Utility functions
- `constants/` - Enums and constants
- `types/` - TypeScript type definitions

## Usage

```javascript
import { validateAuditItem } from "@shared/utils/formValidation";
import { AuditStatus } from "@shared/constants/auditConstants";
```

## Contributing

See [BEST_PRACTICES.md](../docs/BEST_PRACTICES.md)
```

---

## ⚡ Performance

### Guidelines

1. **Component Re-renders**
   ```javascript
   // ✅ Good: Memoized for performance
   export const CategoryItem = React.memo(({ category, onSelect }) => {
     return <div onClick={onSelect}>{category}</div>;
   });

   // ❌ Bad: Re-renders every time parent renders
   export const CategoryItem = ({ category, onSelect }) => {
     return <div onClick={onSelect}>{category}</div>;
   };
   ```

2. **State Management**
   ```javascript
   // ✅ Good: Separate state concerns
   const [auditId, setAuditId] = useState("");
   const [selectedCategories, setSelectedCategories] = useState([]);

   // ❌ Bad: Monolithic state
   const [data, setData] = useState({
     auditId: "",
     selectedCategories: [],
     // ... 20 more fields
   });
   ```

3. **Derived State**
   ```javascript
   // ✅ Good: Calculate when needed
   const isComplete = categories.length > 0 && items.every(i => i.mark);

   // ❌ Bad: Store in state (gets stale)
   const [isComplete, setIsComplete] = useState(false);
   ```

4. **Lists**
   ```javascript
   // ✅ Good: Use unique keys
   {items.map(item => <Item key={item.id} item={item} />)}

   // ❌ Bad: Use array index as key
   {items.map((item, idx) => <Item key={idx} item={item} />)}
   ```

### Performance Budgets

| Metric | Target | Warning |
|--------|--------|---------|
| Initial Load | < 3s | > 5s |
| Form Interaction | < 100ms | > 500ms |
| API Response | < 2s | > 5s |
| Component Render | < 16ms | > 100ms |
| List Scroll (60 items) | 60fps | < 30fps |

---

## 🔒 Security

### Never Store
```javascript
// ❌ Never hardcode credentials
const API_KEY = "sk-1234567890abcdef";
const DB_PASSWORD = "password123";

// ✅ Use environment variables
const API_KEY = process.env.REACT_APP_API_KEY;
const DB_PASSWORD = process.env.DB_PASSWORD;
```

### Input Validation
```javascript
// ✅ Always validate user input
function handleCategorySubmit(categories) {
  const validation = validateCategories(categories);
  if (!validation.isValid) {
    showError(validation.errors[0]);
    return;
  }
  // Process
}

// ❌ Don't trust user input
function handleCategorySubmit(categories) {
  submitToServer(categories); // What if malicious data?
}
```

### API Security
```javascript
// ✅ Validate responses from API
const response = await fetch("/api/audit");
const data = await response.json();
const validated = validateAuditResponse(data);

// ❌ Don't blindly trust API responses
const data = await response.json();
setAudit(data); // Data could be malformed or malicious
```

---

## 📘 TypeScript Standards

### Type Definitions

```typescript
// ✅ Comprehensive types
interface AuditItem {
  id: string;
  category: AuditCategory;
  mark?: "YES" | "NO" | "NA";
  notes?: string;
  photo?: {
    uri: string;
    timestamp: number;
  };
  requiredFields: string[];
}

// ❌ Vague types
interface AuditItem {
  id: string;
  data: any; // Too vague
  extra?: any; // Too vague
}

// ✅ Use enums for fixed values
enum AuditStatus {
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED"
}

// ❌ Don't use string literals scattered
type AuditStatus = "draft" | "in_progress" | "completed";
```

### Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Type Checking
```typescript
// ✅ Good: Explicitly typed
function getValue(key: string): string | null {
  return localStorage.getItem(key);
}

// ❌ Bad: Implicit any
function getValue(key) {
  return localStorage.getItem(key);
}
```

---

## ⚛️ React Best Practices

### Hooks
```javascript
// ✅ Good: Clear, focused hook
function useAuditCategories(auditId: string) {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories(auditId)
      .then(setCategories)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [auditId]);

  return { categories, isLoading, error };
}

// ❌ Bad: Too much logic in component
function AuditForm() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    // Complex logic mixed with render logic
  }, []);
  return <div>...</div>;
}
```

### Props
```typescript
// ✅ Good: Type-safe props
interface CategorySelectorProps {
  categories: string[];
  onSelect: (selected: string[]) => void;
  isMultiSelect?: boolean;
  disabled?: boolean;
}

export function CategorySelector({
  categories,
  onSelect,
  isMultiSelect = true,
  disabled = false
}: CategorySelectorProps) {
  // Implementation
}

// ❌ Bad: Any type, unclear prop names
export function CategorySelector(props) {
  // What props are expected?
}
```

### Error Boundaries
```typescript
// ✅ Good: Catch errors gracefully
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Error caught:", error);
    // Report to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <AuditForm />
</ErrorBoundary>
```

---

## 🎯 Summary

### Daily Checklist Before Pushing Code
- [ ] Naming conventions followed
- [ ] No console.log() left in production code
- [ ] Error handling for all paths
- [ ] No hardcoded values/secrets
- [ ] Code follows team style guide
- [ ] Tests pass locally
- [ ] No merge conflicts
- [ ] Commit messages clear
- [ ] README/docs updated if needed
- [ ] Ready for code review

### Before Release
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation complete
- [ ] Changelog updated
- [ ] Version number bumped
- [ ] Build succeeds without warnings
- [ ] Tested on target devices/browsers

---

**Last Updated**: [Current Session]
**Version**: 1.0
**Author**: AI Expert Agent

For questions or suggestions, create an issue on GitHub or reach out to the team lead.
