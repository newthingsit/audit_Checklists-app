import Constants from 'expo-constants';

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const extra = Constants.expoConfig?.extra || {};

export const PHOTO_FIX_TEMPLATE_IDS = parseList(extra.photoFixTemplateIds).map(id => parseInt(id, 10)).filter(n => !Number.isNaN(n));
export const PHOTO_FIX_TEMPLATE_NAMES = parseList(extra.photoFixTemplateNames).map(n => n.toLowerCase());

export const isPhotoFixTemplate = (templateId, templateName) => {
  if (templateId && PHOTO_FIX_TEMPLATE_IDS.includes(Number(templateId))) return true;
  if (templateName) {
    const name = String(templateName).toLowerCase();
    return PHOTO_FIX_TEMPLATE_NAMES.includes(name);
  }
  return false;
};
