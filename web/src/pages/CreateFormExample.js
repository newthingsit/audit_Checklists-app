import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
} from '@mui/material';
import Layout from '../components/Layout';
import StepIndicator from '../components/StepIndicator';

const CreateFormExample = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    groupName: '',
    description: '',
  });

  const steps = ['Basic Details', 'Add Devices'];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Handle form submission
      console.log('Form submitted:', formData);
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            bgcolor: '#fff',
            borderRadius: 2,
            border: '1px solid #e0e0e0',
          }}
        >
          {/* Step Indicator */}
          <StepIndicator steps={steps} activeStep={activeStep} />

          {/* Form Content */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#333' }}>
                Basic Details
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#666', fontWeight: 500 }}>
                  Group Name
                </Typography>
                <TextField
                  fullWidth
                  placeholder="e.g., Lobby Displays"
                  value={formData.groupName}
                  onChange={handleChange('groupName')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#fff',
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#666', fontWeight: 500 }}>
                  Description
                </Typography>
                <Autocomplete
                  freeSolo
                  options={['jnanesh', 'test', '.htaccess', 'jnanesh employee', 'DB_PORT']}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Enter description"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: '#fff',
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#333' }}>
                Add Devices
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Device selection will be implemented here...
              </Typography>
            </Box>
          )}

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              mt: 4,
              pt: 3,
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <Button
              variant="outlined"
              onClick={activeStep === 0 ? () => window.history.back() : handleBack}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                borderColor: '#e0e0e0',
                color: '#666',
                '&:hover': {
                  borderColor: '#1976d2',
                  color: '#1976d2',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
              }}
            >
              {activeStep === steps.length - 1 ? 'Create' : 'Next →'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
};

export default CreateFormExample;

