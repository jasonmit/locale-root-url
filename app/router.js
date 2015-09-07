import Ember from 'ember';
import config from './config/environment';

function endsWithSlash(str) {
  if (!str) {
    return '/';
  }

  if (str[str.length - 1] !== '/') {
    return str + '/';
  }

  return str;
}

var Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: endsWithSlash(Ember.$('meta[name=rootURL]').attr('content'))
});

Router.map(function() {
});

export default Router;
