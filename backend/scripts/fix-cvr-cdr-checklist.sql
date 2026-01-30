-- =====================================================
-- CVR - CDR Checklist Fixes
-- Purpose: Fix naming, remove duplicates, optimize structure
-- Date: 2026-01-30
-- =====================================================

-- =====================================================
-- 1. FIX TEMPLATE NAMING CONSISTENCY
-- =====================================================
PRINT '1. Fixing template name consistency...';

UPDATE checklist_templates
SET name = 'CVR - CDR Checklist',
    description = 'Customer Visitor Review - Customer Delight Review Checklist'
WHERE id = 43;

PRINT 'Template name updated to: CVR - CDR Checklist';

-- =====================================================
-- 2. IDENTIFY DUPLICATE ITEMS
-- =====================================================
PRINT '';
PRINT '2. Identifying duplicate items...';

-- Find duplicate "Hostess desk is clean and well maintained"
SELECT 
    id, 
    title, 
    category, 
    subcategory,
    order_index
FROM checklist_items
WHERE template_id = 43
  AND title = 'Hostess desk is clean and well maintained'
ORDER BY order_index;

-- Find duplicate "Beverage systems and CO2 cylinders"
SELECT 
    id, 
    title, 
    category, 
    subcategory,
    order_index
FROM checklist_items
WHERE template_id = 43
  AND title LIKE '%Beverage systems and CO2 cylinders%'
ORDER BY order_index;

-- Find duplicate "Ice machines and bins"
SELECT 
    id, 
    title, 
    category, 
    subcategory,
    order_index
FROM checklist_items
WHERE template_id = 43
  AND title LIKE '%Ice machines and bins%'
ORDER BY order_index;

-- =====================================================
-- 3. REMOVE DUPLICATE ITEMS (Keep first occurrence)
-- =====================================================
PRINT '';
PRINT '3. Removing duplicate items...';

-- Remove duplicate hostess desk (keep Entrance version, remove FOH version)
DELETE FROM checklist_items
WHERE template_id = 43
  AND title = 'Hostess desk is clean and well maintained'
  AND category = 'HYGIENE AND CLEANLINESS'
  AND subcategory = 'FOH';

PRINT 'Removed duplicate: Hostess desk (FOH version)';

-- Remove duplicate beverage systems (keep Bar version, remove BOH version)
DELETE FROM checklist_items
WHERE template_id = 43
  AND title LIKE '%Beverage systems and CO2 cylinders%'
  AND category = 'HYGIENE AND CLEANLINESS'
  AND subcategory = 'Back of the house and equipment is clean';

PRINT 'Removed duplicate: Beverage systems (BOH version)';

-- Remove duplicate ice machines (keep Bar version, remove BOH version)
DELETE FROM checklist_items
WHERE template_id = 43
  AND title LIKE '%Ice machines and bins%'
  AND category = 'HYGIENE AND CLEANLINESS'
  AND subcategory = 'Back of the house and equipment is clean';

PRINT 'Removed duplicate: Ice machines (BOH version)';

-- =====================================================
-- 4. UPDATE SPEED OF SERVICE ITEMS TO OPTIONAL
-- =====================================================
PRINT '';
PRINT '4. Making Speed of Service transactions 2-4 optional...';

-- Make all Trnx-2, Trnx-3, Trnx-4 items optional (not required)
UPDATE checklist_items
SET required = 0
WHERE template_id = 43
  AND category = 'SERVICE'
  AND subcategory = 'Speed of Service'
  AND section IN ('Trnx-2', 'Trnx-3', 'Trnx-4');

PRINT 'Speed of Service transactions 2-4 are now optional';

-- =====================================================
-- 5. FIX AMBIGUOUS ITEM DESCRIPTIONS
-- =====================================================
PRINT '';
PRINT '5. Fixing ambiguous item descriptions...';

-- Fix "CVR followed" to be more specific
UPDATE checklist_items
SET title = 'CVR audit conducted and documented within last 30 days',
    description = 'Customer Visitor Review (CVR) has been performed and records are available'
WHERE template_id = 43
  AND title = 'CVR followed';

PRINT 'Fixed: CVR followed -> CVR audit conducted and documented';

-- Fix "Using approved ingredients" double negative
UPDATE checklist_items
SET title = 'All non-branded ingredients are approved and documented',
    description = 'Non-branded or generic ingredients have proper approval documentation'
WHERE template_id = 43
  AND title = 'Using approved ingredients or foods (Non-Brand/Non-Food Safety critical).';

PRINT 'Fixed: Approved ingredients description';

-- =====================================================
-- 6. REORDER ITEMS AFTER DELETIONS
-- =====================================================
PRINT '';
PRINT '6. Reordering items to fill gaps...';

-- Reorder all items in sequence
WITH OrderedItems AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY order_index, id) AS new_order
    FROM checklist_items
    WHERE template_id = 43
)
UPDATE ci
SET ci.order_index = oi.new_order
FROM checklist_items ci
INNER JOIN OrderedItems oi ON ci.id = oi.id
WHERE ci.template_id = 43;

PRINT 'Items reordered successfully';

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================
PRINT '';
PRINT '7. Verification...';
PRINT '';

-- Count total items
SELECT 
    COUNT(*) AS total_items,
    'Total items in CVR - CDR Checklist' AS description
FROM checklist_items
WHERE template_id = 43;

-- Count by category
SELECT 
    category,
    COUNT(*) AS item_count
FROM checklist_items
WHERE template_id = 43
GROUP BY category
ORDER BY item_count DESC;

-- Count required vs optional Speed of Service items
SELECT 
    section,
    SUM(CASE WHEN required = 1 THEN 1 ELSE 0 END) AS required_items,
    SUM(CASE WHEN required = 0 THEN 1 ELSE 0 END) AS optional_items
FROM checklist_items
WHERE template_id = 43
  AND category = 'SERVICE'
  AND subcategory = 'Speed of Service'
GROUP BY section
ORDER BY section;

-- Verify no remaining duplicates
SELECT 
    title,
    category,
    subcategory,
    COUNT(*) AS duplicate_count
FROM checklist_items
WHERE template_id = 43
GROUP BY title, category, subcategory
HAVING COUNT(*) > 1;

PRINT '';
PRINT '✅ CVR - CDR Checklist fixes completed!';
PRINT '';
