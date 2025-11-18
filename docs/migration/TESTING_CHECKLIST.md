# Database Migration Testing Checklist

Use this checklist to ensure a successful migration from SQLite to PostgreSQL/MySQL.

## Pre-Migration Testing

### Environment Setup
- [ ] Development/staging environment configured
- [ ] Target database (PostgreSQL/MySQL) installed and running
- [ ] Database user created with proper permissions
- [ ] Environment variables configured
- [ ] Backup of SQLite database created
- [ ] Migration scripts tested on sample data

### Data Verification (Before Migration)
- [ ] Record counts documented for all tables
- [ ] Sample data exported for comparison
- [ ] Foreign key relationships verified
- [ ] No orphaned records detected

## Migration Execution

### Schema Migration
- [ ] PostgreSQL/MySQL schema created successfully
- [ ] All tables created with correct structure
- [ ] Foreign keys and constraints applied
- [ ] Indexes created
- [ ] No schema errors or warnings

### Data Migration
- [ ] Migration script executed without errors
- [ ] All tables migrated successfully
- [ ] Record counts match between SQLite and target database
- [ ] Data types converted correctly
- [ ] NULL values handled properly
- [ ] Date/time values preserved correctly
- [ ] Boolean values converted correctly

### Data Integrity Verification
- [ ] Foreign key relationships maintained
- [ ] No orphaned records created
- [ ] Unique constraints preserved
- [ ] Default values applied correctly
- [ ] Auto-increment sequences set correctly

## Functional Testing

### Authentication & Authorization
- [ ] User login works
- [ ] Password verification works
- [ ] JWT tokens generated correctly
- [ ] Role-based access control works
- [ ] Session management works

### User Management
- [ ] Create new user
- [ ] Update user information
- [ ] Delete user
- [ ] List all users
- [ ] User roles assigned correctly

### Checklist Templates
- [ ] Create new template
- [ ] Update template
- [ ] Delete template
- [ ] List templates
- [ ] Template items loaded correctly
- [ ] Template options loaded correctly (if applicable)

### Audits
- [ ] Create new audit
- [ ] View audit details
- [ ] Update audit items
- [ ] Select options with marks
- [ ] Add comments to items
- [ ] Upload photos
- [ ] Complete audit
- [ ] Score calculation works correctly
- [ ] Delete audit

### Reports
- [ ] Monthly scorecard generates
- [ ] Scheduled audits report generates
- [ ] PDF export works
- [ ] CSV export works
- [ ] Report filters work correctly
- [ ] Data accuracy verified

### Scheduled Audits
- [ ] Create scheduled audit
- [ ] Update scheduled audit
- [ ] Delete scheduled audit
- [ ] List scheduled audits
- [ ] User assignment works
- [ ] Frequency calculations correct

### Action Items
- [ ] Create action item
- [ ] Update action item
- [ ] Delete action item
- [ ] Assign action items
- [ ] Mark action items complete

### Locations
- [ ] Create location
- [ ] Update location
- [ ] Delete location
- [ ] List locations
- [ ] Location search works

## Performance Testing

### Query Performance
- [ ] Login query < 100ms
- [ ] Audit list query < 500ms
- [ ] Audit detail query < 200ms
- [ ] Report generation < 2s
- [ ] Complex queries optimized

### Concurrent Operations
- [ ] Multiple users can login simultaneously
- [ ] Multiple users can create audits simultaneously
- [ ] Multiple users can update different audits
- [ ] No deadlocks or timeouts
- [ ] Connection pooling works correctly

### Load Testing
- [ ] 10 concurrent users - all operations work
- [ ] 50 concurrent users - acceptable performance
- [ ] 100 concurrent users - system stable
- [ ] Database connections managed efficiently
- [ ] Memory usage acceptable

## Data Validation

### Sample Data Checks
- [ ] Random sample of users verified
- [ ] Random sample of audits verified
- [ ] Random sample of audit items verified
- [ ] Relationships between tables verified
- [ ] Calculated fields (scores, counts) verified

### Edge Cases
- [ ] Empty tables handled correctly
- [ ] NULL values handled correctly
- [ ] Very long text fields handled
- [ ] Special characters in data preserved
- [ ] Date boundaries handled correctly

## API Testing

### All Endpoints
- [ ] GET /api/health - works
- [ ] POST /api/auth/login - works
- [ ] GET /api/audits - works
- [ ] POST /api/audits - works
- [ ] PUT /api/audits/:id/items/:itemId - works
- [ ] GET /api/reports/monthly-scorecard - works
- [ ] GET /api/scheduled-audits - works
- [ ] All other endpoints tested

### Error Handling
- [ ] Invalid credentials return 401
- [ ] Missing data returns 400
- [ ] Not found returns 404
- [ ] Server errors return 500
- [ ] Error messages are clear

## Post-Migration

### Monitoring
- [ ] Error logs reviewed - no critical errors
- [ ] Performance metrics within acceptable range
- [ ] Database connection pool healthy
- [ ] No memory leaks detected
- [ ] CPU usage normal

### Backup & Recovery
- [ ] Automated backups configured
- [ ] Backup restoration tested
- [ ] Point-in-time recovery tested (if applicable)
- [ ] Backup schedule documented

### Documentation
- [ ] Migration process documented
- [ ] Configuration changes documented
- [ ] Known issues documented
- [ ] Rollback procedure documented
- [ ] Team trained on new database

## Rollback Testing (If Needed)

### Rollback Procedure
- [ ] Rollback script tested
- [ ] SQLite database restored successfully
- [ ] Application works with SQLite after rollback
- [ ] No data loss during rollback
- [ ] Rollback time documented

## Sign-off

- [ ] All critical tests passed
- [ ] Performance acceptable
- [ ] Data integrity verified
- [ ] Team approval obtained
- [ ] Production migration scheduled
- [ ] Rollback plan ready

## Notes

Document any issues, observations, or deviations from expected behavior:

---

**Migration Date:** _______________
**Migrated By:** _______________
**Reviewed By:** _______________
**Status:** ☐ Passed  ☐ Failed  ☐ Needs Review

