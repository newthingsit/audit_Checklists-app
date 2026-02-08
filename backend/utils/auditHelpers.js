/**
 * Audit Helpers — Shared utility functions for audit operations.
 *
 * Extracted from routes/audits.js to improve maintainability.
 */

const logger = require('./logger');

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------

const RECURRING_FAILURE_THRESHOLD = 2;
const CRITICAL_RECURRING_THRESHOLD = 3;
const RECURRING_LOOKBACK_MONTHS = 6;

// -----------------------------------------------------------------------
// Mark / Score helpers
// -----------------------------------------------------------------------

const isFailureMark = (mark) => {
  if (!mark && mark !== 0 && mark !== '0') return false;
  const markStr = String(mark).toUpperCase();
  if (markStr === '0' || markStr === 'NO' || markStr === 'FAIL') return true;
  const markNum = parseFloat(mark);
  return Number.isFinite(markNum) && markNum === 0;
};

const isPassMark = (mark) => {
  if (!mark && mark !== 0 && mark !== '0') return false;
  const markStr = String(mark).toUpperCase();
  if (markStr === 'YES' || markStr === 'PASS') return true;
  const markNum = parseFloat(mark);
  return Number.isFinite(markNum) && markNum > 0;
};

const calculateTimeBasedScore = (averageTimeMinutes, targetTimeMinutes = 2) => {
  const avg = Number(averageTimeMinutes);
  if (!Number.isFinite(avg) || avg <= 0) return null;
  const t = Number(targetTimeMinutes);
  const target = Number.isFinite(t) && t > 0 ? t : 2;
  if (avg < target) return 100;
  if (avg < target + 1) return 90;
  if (avg < target + 2) return 80;
  if (avg < target + 3) return 70;
  const score = 70 - ((avg - (target + 3)) * 10);
  return Math.max(0, Math.round(score));
};

// -----------------------------------------------------------------------
// Parsing helpers
// -----------------------------------------------------------------------

const parseTimeEntriesToArray = (time_entries) => {
  if (time_entries === undefined || time_entries === null) return [];
  if (Array.isArray(time_entries)) return time_entries;
  if (typeof time_entries === 'string') {
    try {
      const parsed = JSON.parse(time_entries);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const computeAverageMinutes = (time_entries) => {
  const entries = parseTimeEntriesToArray(time_entries)
    .map(t => Number(t))
    .filter(t => Number.isFinite(t) && t > 0);
  if (entries.length === 0) return null;
  const avg = entries.reduce((sum, t) => sum + t, 0) / entries.length;
  return Math.round(avg * 100) / 100;
};

const parseInfoNotes = (notes) => {
  if (!notes) return null;
  if (typeof notes === 'object') return notes;
  if (typeof notes !== 'string') return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeCategoryValue = (value) => {
  if (!value) return null;
  let normalized = String(value).trim().replace(/\s+/g, ' ');
  normalized = normalized.replace(/\s*&\s*/g, ' & ');
  normalized = normalized.replace(/\s+and\s+/gi, ' & ');
  normalized = normalized.replace(/\s*–\s*/g, ' - ');
  normalized = normalized.replace(/\s*-\s*/g, ' - ');
  normalized = normalized.replace(/\bAcknowledgment\b/gi, 'Acknowledgement');
  return normalized || null;
};

const validateInfoStepNotes = (notes) => {
  const parsed = parseInfoNotes(notes);
  if (!parsed) return null;
  const hasInfoFields = ['attendees', 'pointsDiscussed', 'infoPictures']
    .some(key => Object.prototype.hasOwnProperty.call(parsed, key));
  if (!hasInfoFields) return null;
  const attendees = String(parsed.attendees || '').trim();
  const pointsDiscussed = String(parsed.pointsDiscussed || '').trim();
  const infoPictures = Array.isArray(parsed.infoPictures) ? parsed.infoPictures : [];
  if (!attendees || !pointsDiscussed) {
    return {
      error: 'Info step data is incomplete',
      details: { hasAttendees: !!attendees, hasPointsDiscussed: !!pointsDiscussed, pictureCount: infoPictures.length }
    };
  }
  return null;
};

const hasNonEmptyValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const parseMultiSelectionComment = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && Array.isArray(parsed.selections)) {
      return { text: typeof parsed.text === 'string' ? parsed.text : '', selections: parsed.selections };
    }
  } catch {
    return null;
  }
  return null;
};

// -----------------------------------------------------------------------
// Input type helpers
// -----------------------------------------------------------------------

const normalizeInputType = (inputType) => String(inputType || '').toLowerCase();

const isMultiSelectInputType = (inputType) => {
  const n = normalizeInputType(inputType);
  return n === 'multiple_answer' || n === 'grid';
};

const isOptionInputType = (inputType) => {
  const n = normalizeInputType(inputType);
  return n === 'option_select' || n === 'select_from_data_source' || n === 'dropdown';
};

const isAnswerInputType = (inputType) => {
  const n = normalizeInputType(inputType);
  return ['open_ended', 'description', 'number', 'date', 'scan_code', 'signature', 'short_answer', 'long_answer', 'time'].includes(n);
};

// -----------------------------------------------------------------------
// Item completion helpers
// -----------------------------------------------------------------------

const isItemCompletedForProgress = (item) => {
  const inputType = normalizeInputType(item?.input_type);
  const hasMark = hasNonEmptyValue(item?.mark);
  const hasStatus = hasNonEmptyValue(item?.status) && String(item.status).toLowerCase() !== 'pending';
  const hasOption = item?.selected_option_id !== undefined && item?.selected_option_id !== null;
  const hasComment = hasNonEmptyValue(item?.comment);
  const hasPhoto = hasNonEmptyValue(item?.photo_url);
  const hasMultiSelections = isMultiSelectInputType(inputType) &&
    !!(parseMultiSelectionComment(item?.comment)?.selections?.length);

  if (isMultiSelectInputType(inputType)) return hasMultiSelections || hasMark || hasOption;
  if (isOptionInputType(inputType)) return hasOption || hasMark;
  if (inputType === 'image_upload') return hasPhoto || hasMark;
  if (inputType === 'task') return hasStatus || hasMark;
  if (isAnswerInputType(inputType)) {
    if (inputType === 'signature') return hasPhoto || hasComment || hasMark;
    return hasComment || hasMark;
  }
  return hasMark || hasStatus || hasOption || hasComment || hasPhoto;
};

const getEffectiveMarkValue = (item) => {
  if (hasNonEmptyValue(item?.mark)) return item.mark;
  if (hasNonEmptyValue(item?.option_mark)) return item.option_mark;
  return null;
};

// -----------------------------------------------------------------------
// Scheduling helpers
// -----------------------------------------------------------------------

const getNextScheduledDate = (currentDate, frequency) => {
  if (!frequency) return null;
  const date = new Date(currentDate || new Date());
  switch (frequency) {
    case 'daily':  date.setDate(date.getDate() + 1); break;
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    default: return null;
  }
  return date.toISOString().split('T')[0];
};

const isUniqueConstraintError = (err) => {
  if (!err) return false;
  const code = err.code || '';
  const message = (err.message || '').toLowerCase();
  return (
    code === 'SQLITE_CONSTRAINT' ||
    code === 'ER_DUP_ENTRY' ||
    code === '23505' ||
    message.includes('unique') ||
    message.includes('duplicate')
  );
};

module.exports = {
  RECURRING_FAILURE_THRESHOLD,
  CRITICAL_RECURRING_THRESHOLD,
  RECURRING_LOOKBACK_MONTHS,
  isFailureMark,
  isPassMark,
  calculateTimeBasedScore,
  parseTimeEntriesToArray,
  computeAverageMinutes,
  parseInfoNotes,
  normalizeCategoryValue,
  validateInfoStepNotes,
  hasNonEmptyValue,
  parseMultiSelectionComment,
  normalizeInputType,
  isMultiSelectInputType,
  isOptionInputType,
  isAnswerInputType,
  isItemCompletedForProgress,
  getEffectiveMarkValue,
  getNextScheduledDate,
  isUniqueConstraintError,
};
