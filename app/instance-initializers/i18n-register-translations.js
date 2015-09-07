import Ember from 'ember';

export default {
  name: 'i18n-register-translations',
  initialize(instance) {
    let locale = Ember.$('meta[name=locale]').attr('content');
    let translations = Ember.$('meta[name=translations]').attr('content');

    if (locale && translations) {
      let i18n = instance.container.lookup('service:i18n');
      i18n.addTranslations(locale, JSON.parse(translations));
      i18n.set('locale', locale);
    }
  }
};
