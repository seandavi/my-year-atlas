// The worker shares the site's locale modules (plain ESM, no vite-isms) so
// the two surfaces can never disagree on copy. Static imports — bundle size
// is irrelevant at the edge and workerd has full ICU for Intl.DisplayNames.
import en from '../../site/src/i18n/en.js';
import es from '../../site/src/i18n/es.js';
import pt from '../../site/src/i18n/pt.js';

const LOCALES = { en, es, pt };
export const getLocale = (lang) => LOCALES[lang] ?? en;
