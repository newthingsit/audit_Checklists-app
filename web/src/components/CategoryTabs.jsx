import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
} from '@mui/material';
import PropTypes from 'prop-types';

/**
 * CategoryTabs Component
 * Displays category tabs with completion progress
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array<string>} props.categories - List of category names
 * @param {Object} props.categoryStatus - Completion status for each category
 * @param {number} props.activeStep - Currently active tab index
 * @param {Function} props.onCategoryChange - Callback when category changes
 * @returns {React.ReactElement}
 */
const CategoryTabs = ({ categories, categoryStatus, activeStep, onCategoryChange }) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  const handleChange = (event, newValue) => {
    onCategoryChange(newValue);
  };

  const getProgressColor = (status) => {
    if (!status) return 'inherit';
    const percentage = (status.completed / status.total) * 100;
    if (percentage === 100) return 'success';
    if (percentage >= 50) return 'info';
    return 'warning';
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={activeStep}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTabs-scrollButtons': {
            '&.Mui-disabled': { opacity: 0.3 },
          },
        }}
      >
        {categories.map((category, index) => {
          const status = categoryStatus[category];
          const percentage = status ? (status.completed / status.total) * 100 : 0;
          
          return (
            <Tab
              key={`${category}-${index}`}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{category}</span>
                  {status && (
                    <Chip
                      label={`${status.completed}/${status.total}`}
                      size="small"
                      variant="outlined"
                      color={getProgressColor(status)}
                    />
                  )}
                </Box>
              }
              sx={{
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  backgroundColor: percentage === 100 ? '#4caf50' : '#ff9800',
                  width: `${percentage}%`,
                  transition: 'width 0.3s ease',
                },
              }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
};

CategoryTabs.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  categoryStatus: PropTypes.objectOf(
    PropTypes.shape({
      completed: PropTypes.number,
      total: PropTypes.number,
      isComplete: PropTypes.bool,
    })
  ).isRequired,
  activeStep: PropTypes.number.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
};

export default CategoryTabs;
