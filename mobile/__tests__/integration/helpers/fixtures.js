/**
 * Integration Test Fixtures
 * Common test data for integration tests
 */

// Sample audit templates
export const sampleTemplates = {
  safetyAudit: {
    id: 1,
    name: 'Safety Audit',
    template_name: 'Safety Audit',
    description: 'Comprehensive safety inspection checklist',
    category_id: 1,
    items_count: 15,
    duration_minutes: 30,
  },
  fireSafetyAudit: {
    id: 2,
    name: 'Fire Safety',
    template_name: 'Fire Safety Audit',
    description: 'Fire safety compliance check',
    category_id: 2,
    items_count: 20,
    duration_minutes: 45,
  },
  environmentalAudit: {
    id: 3,
    name: 'Environmental',
    template_name: 'Environmental Audit',
    description: 'Environmental compliance audit',
    category_id: 3,
    items_count: 25,
    duration_minutes: 60,
  },
};

// Sample audit items for checklists
export const sampleAuditItems = [
  {
    id: 1,
    name: 'Check fire extinguisher',
    template_id: 2,
    description: 'Verify fire extinguisher is accessible and charged',
    item_type: 'checkbox',
    options: ['Yes', 'No', 'N/A'],
    required: true,
  },
  {
    id: 2,
    name: 'Emergency exits clear',
    template_id: 2,
    description: 'Ensure emergency exits are not blocked',
    item_type: 'checkbox',
    options: ['Yes', 'No', 'N/A'],
    required: true,
  },
  {
    id: 3,
    name: 'Alarm system functional',
    template_id: 2,
    description: 'Test fire alarm system',
    item_type: 'checkbox',
    options: ['Yes', 'No', 'N/A'],
    required: false,
  },
];

// Sample user data
export const sampleUser = {
  id: '1',
  name: 'John Auditor',
  email: 'john@example.com',
  role: 'auditor',
  permissions: ['canStartSchedule', 'canRescheduleSchedule', 'canEditAudit'],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-02-18T00:00:00Z',
};

// Sample location data
export const sampleLocations = [
  {
    id: 1,
    name: 'Main Office',
    address: '123 Main St, New York, NY 10001',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Branch Office',
    address: '456 Branch Ave, Los Angeles, CA 90001',
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: 'America/Los_Angeles',
    createdAt: '2025-06-15T00:00:00Z',
  },
];

// Sample audit data (completed)
export const sampleCompletedAudit = {
  id: '100',
  template_id: 1,
  template_name: 'Safety Audit',
  user_id: '1',
  location_id: 1,
  status: 'completed',
  started_at: '2026-02-18T08:00:00Z',
  completed_at: '2026-02-18T08:30:00Z',
  items: [
    {
      id: 1,
      audit_id: '100',
      item_id: 1,
      response: 'Yes',
      notes: '',
    },
    {
      id: 2,
      audit_id: '100',
      item_id: 2,
      response: 'No',
      notes: 'Needs replacement',
    },
  ],
};

// Sample audit data (in progress)
export const sampleInProgressAudit = {
  id: '101',
  template_id: 1,
  template_name: 'Safety Audit',
  user_id: '1',
  location_id: 1,
  status: 'in_progress',
  started_at: '2026-02-18T09:00:00Z',
  completed_at: null,
  items: [],
};

// Sample scheduled audit
export const sampleScheduledAudit = {
  id: '10',
  template_id: 1,
  template_name: 'Safety Audit',
  schedule_name: 'Weekly Safety Audit',
  location_id: 1,
  status: 'pending',
  scheduled_date: '2026-02-25T08:00:00Z',
  recurrence: 'weekly',
  linked_audits: ['100'],
  rescheduled_count: 0,
};

// Sample audit history
export const sampleAuditHistory = [
  {
    ...sampleCompletedAudit,
    id: '100',
    completed_at: '2026-02-18T08:30:00Z',
  },
  {
    ...sampleCompletedAudit,
    id: '99',
    completed_at: '2026-02-16T08:30:00Z',
  },
  {
    ...sampleCompletedAudit,
    id: '98',
    completed_at: '2026-02-14T08:30:00Z',
  },
];

// Sample notifications
export const sampleNotifications = [
  {
    id: '1',
    title: 'Audit Scheduled',
    message: 'Weekly Safety Audit scheduled for tomorrow at 8:00 AM',
    type: 'schedule',
    createdAt: '2026-02-18T16:00:00Z',
    read: false,
  },
  {
    id: '2',
    title: 'Audit Completed',
    message: 'Safety Audit completed successfully',
    type: 'completed',
    createdAt: '2026-02-18T08:30:00Z',
    read: true,
  },
];

// Sample audit form submission data
export const sampleAuditFormData = {
  template_id: 1,
  template_name: 'Safety Audit',
  location_id: 1,
  category: 'Fire Safety',
  items: [
    {
      item_id: 1,
      response: 'Yes',
      notes: '',
      photo_id: null,
    },
    {
      item_id: 2,
      response: 'Yes',
      notes: 'All exits properly marked',
      photo_id: null,
    },
    {
      item_id: 3,
      response: 'No',
      notes: 'Alarm tested, working properly',
      photo_id: null,
    },
  ],
  signature: 'data:image/png;base64,...',
  notes: 'All items checked and compliant',
  duration_seconds: 1800,
  submitted_at: new Date().toISOString(),
};

// Sample network error response
export const sampleNetworkError = {
  message: 'Network Error',
  code: 'NETWORK_ERROR',
  status: 0,
};

// Sample API error responses
export const sampleApiErrors = {
  unauthorized: {
    status: 401,
    data: {
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    },
  },
  forbidden: {
    status: 403,
    data: {
      error: 'Forbidden',
      message: 'You do not have permission to perform this action',
    },
  },
  notFound: {
    status: 404,
    data: {
      error: 'Not Found',
      message: 'Resource not found',
    },
  },
  serverError: {
    status: 500,
    data: {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    },
  },
  validation: {
    status: 422,
    data: {
      error: 'Validation Error',
      message: 'Invalid input data',
      fields: {
        template_id: ['Template ID is required'],
        location_id: ['Location ID must be valid'],
      },
    },
  },
};

// Helper function to create custom audit
export const createAudit = (overrides = {}) => {
  return {
    ...sampleInProgressAudit,
    ...overrides,
  };
};

// Helper function to create custom template
export const createTemplate = (overrides = {}) => {
  return {
    ...sampleTemplates.safetyAudit,
    ...overrides,
  };
};

// Helper function to create API response
export const createApiResponse = (data, status = 200) => {
  return Promise.resolve({
    status,
    data,
  });
};

// Helper function to create API error
export const createApiError = (status = 500, error = null) => {
  return Promise.reject({
    response: {
      status,
      data: error || sampleApiErrors.serverError.data,
    },
  });
};
