import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  LinearProgress,
} from '@mui/material';
import PropTypes from 'prop-types';

/**
 * FormStepperHeader Component
 * Displays form progression with visual feedback
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.currentStep - Current step (0-2: info, categories, checklist)
 * @param {Object} props.completionStatus - Completion stats
 * @param {Function} props.onStepChange - Handle step navigation
 * @returns {React.ReactElement}
 */
const FormStepperHeader = ({
  currentStep,
  completionStatus,
  onStepChange,
}) => {
  const steps = [
    { name: 'Audit Info', index: 0 },
    { name: 'Categories', index: 1 },
    { name: 'Checklist', index: 2 },
  ];

  const progress = completionStatus?.percentage || 0;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          {steps.map((step) => (
            <Box
              key={step.index}
              sx={{
                flex: 1,
                textAlign: 'center',
                px: 1,
                cursor: currentStep !== step.index ? 'pointer' : 'default',
                opacity: currentStep === step.index ? 1 : 0.6,
              }}
              onClick={() => {
                if (currentStep > step.index) {
                  onStepChange(step.index);
                }
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                  backgroundColor:
                    currentStep >= step.index ? '#1976d2' : '#e0e0e0',
                  color: currentStep >= step.index ? 'white' : 'textSecondary',
                  fontWeight: 'bold',
                }}
              >
                {currentStep > step.index ? '✓' : step.index + 1}
              </Box>
              <Typography variant="caption">{step.name}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Progress: {progress}%
          </Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>

        {completionStatus && (
          <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
            <Typography variant="caption">
              Categories: {completionStatus.completedCategories}/{completionStatus.totalCategories}
            </Typography>
            <Typography variant="caption">
              Items: {completionStatus.completedItems}/{completionStatus.totalItems}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

FormStepperHeader.propTypes = {
  currentStep: PropTypes.number.isRequired,
  completionStatus: PropTypes.shape({
    percentage: PropTypes.number,
    completedCategories: PropTypes.number,
    totalCategories: PropTypes.number,
    completedItems: PropTypes.number,
    totalItems: PropTypes.number,
  }),
  onStepChange: PropTypes.func.isRequired,
};

FormStepperHeader.defaultProps = {
  completionStatus: null,
};

export default FormStepperHeader;
