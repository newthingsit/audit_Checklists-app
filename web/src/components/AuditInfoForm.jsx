import React from 'react';
import {
  Box,
  TextField,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import PropTypes from 'prop-types';

/**
 * AuditInfoForm Component
 * Handles audit metadata input: notes, location info, general details
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.notes - Audit notes
 * @param {Function} props.onNotesChange - Callback when notes change
 * @param {string} props.auditId - Current audit ID
 * @param {Object} props.selectedLocation - Selected location object
 * @returns {React.ReactElement}
 */
const AuditInfoForm = ({ notes, onNotesChange, auditId, selectedLocation }) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Audit Information
        </Typography>
        
        <Grid container spacing={2}>
          {auditId && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Audit ID"
                value={auditId}
                disabled
                fullWidth
                size="small"
              />
            </Grid>
          )}
          
          {selectedLocation && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="Location"
                value={selectedLocation.name || ''}
                disabled
                fullWidth
                size="small"
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Enter any notes or observations"
              variant="outlined"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

AuditInfoForm.propTypes = {
  notes: PropTypes.string.isRequired,
  onNotesChange: PropTypes.func.isRequired,
  auditId: PropTypes.string,
  selectedLocation: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
};

AuditInfoForm.defaultProps = {
  auditId: '',
  selectedLocation: null,
};

export default AuditInfoForm;
