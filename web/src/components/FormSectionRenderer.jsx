import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import PropTypes from 'prop-types';

/**
 * FormSectionRenderer Component
 * Renders form items for a specific category/section
 * Handles different input types (radio, checkbox, text, date, etc.)
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.items - Items to render
 * @param {Object} props.formState - Current form state
 * @param {Object} props.handlers - Event handlers
 * @returns {React.ReactElement}
 */
const FormSectionRenderer = ({ items, formState, handlers }) => {
  if (!items || items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="textSecondary">No items to display</Typography>
      </Box>
    );
  }

  const renderItem = (item) => {
    const value = formState.responses[item.id] || '';
    const selectedOption = formState.selectedOptions[item.id];
    const inputValue = formState.inputValues[item.id] || '';
    const comment = formState.comments[item.id] || '';

    return (
      <Card key={item.id} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {item.name}
          </Typography>
          
          {item.description && (
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {item.description}
            </Typography>
          )}

          <Box sx={{ mt: 2 }}>
            {item.type === 'single_choice' && item.options && (
              <RadioGroup
                value={selectedOption || ''}
                onChange={(e) => handlers.updateSelectedOption(item.id, e.target.value)}
              >
                {item.options.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    control={<Radio />}
                    label={option.name}
                  />
                ))}
              </RadioGroup>
            )}

            {item.type === 'multiple_answer' && item.options && (
              <Box>
                {item.options.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    control={
                      <Checkbox
                        checked={
                          formState.multipleSelections[item.id]?.includes(
                            option.id
                          ) || false
                        }
                        onChange={() =>
                          handlers.updateMultipleSelection(item.id, option.id)
                        }
                      />
                    }
                    label={option.name}
                  />
                ))}
              </Box>
            )}

            {item.type === 'open_ended' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                value={inputValue}
                onChange={(e) =>
                  handlers.updateInputValue(item.id, e.target.value)
                }
                placeholder="Enter your response"
              />
            )}

            {item.type === 'number' && (
              <TextField
                fullWidth
                type="number"
                value={inputValue}
                onChange={(e) =>
                  handlers.updateInputValue(item.id, e.target.value)
                }
                placeholder="Enter a number"
              />
            )}

            {item.type === 'date' && (
              <TextField
                fullWidth
                type="date"
                value={inputValue}
                onChange={(e) =>
                  handlers.updateInputValue(item.id, e.target.value)
                }
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Box>

          {/* Comment field */}
          <TextField
            fullWidth
            multiline
            rows={2}
            value={comment}
            onChange={(e) => handlers.updateComment(item.id, e.target.value)}
            placeholder="Add a comment (optional)"
            sx={{ mt: 2 }}
            size="small"
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {items.map(renderItem)}
    </Box>
  );
};

FormSectionRenderer.propTypes = {
  items: PropTypes.array.isRequired,
  formState: PropTypes.object.isRequired,
  handlers: PropTypes.object.isRequired,
};

export default FormSectionRenderer;
