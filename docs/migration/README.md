# Database Migration Documentation

This directory contains comprehensive documentation and scripts for migrating from SQLite to PostgreSQL or MySQL.

## Quick Start

1. **Read the Migration Guide**: Start with [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for step-by-step instructions.

2. **Choose Your Database**: 
   - PostgreSQL: Better for complex queries, JSON support, full-text search
   - MySQL: More common, easier setup, good performance

3. **Run Migration**: Follow the guide for your chosen database.

## Files in This Directory

- **MIGRATION_GUIDE.md** - Complete step-by-step migration guide
- **TESTING_CHECKLIST.md** - Comprehensive testing checklist
- **README.md** - This file

## Migration Scripts

Located in `backend/scripts/`:

- `migrate-data-sqlite-to-postgresql.js` - Migrates data to PostgreSQL
- `migrate-data-sqlite-to-mysql.js` - Migrates data to MySQL

## When to Migrate

**Current Status**: SQLite is perfectly fine for 250+ users/restaurants.

**Consider Migration When**:
- 1000+ concurrent users
- Heavy concurrent writes
- Need for advanced features
- High availability requirements

## Support

For questions or issues:
1. Review the migration guide
2. Check the testing checklist
3. Review migration script logs
4. Contact the development team

## Next Steps

After migration:
- Monitor performance
- Set up automated backups
- Configure replication (if needed)
- Update team documentation

