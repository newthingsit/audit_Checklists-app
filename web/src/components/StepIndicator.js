import React from 'react';
import { Box, Typography, Stepper, Step, StepLabel } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const StepIndicator = ({ steps, activeStep }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label} completed={index < activeStep}>
            <StepLabel
              StepIconComponent={({ active, completed }) => (
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: completed
                      ? '#1976d2'
                      : active
                      ? '#1976d2'
                      : '#e0e0e0',
                    color: completed || active ? '#fff' : '#999',
                    fontWeight: 600,
                    fontSize: '1rem',
                    border: active ? '3px solid #1976d2' : 'none',
                  }}
                >
                  {completed ? (
                    <CheckCircleIcon sx={{ fontSize: 24, color: '#fff' }} />
                  ) : (
                    index + 1
                  )}
                </Box>
              )}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: activeStep === index ? 600 : 400,
                  color: activeStep === index ? '#1976d2' : '#666',
                  mt: 1,
                }}
              >
                {label}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default StepIndicator;

