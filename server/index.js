'use strict';

var serialize = require('serialize-javascript');
var cheerio = require('cheerio');
var yaml = require('js-yaml');
var path = require('path');
var url = require('url');
var fs = require('fs');

var BASE_DIRECTORY = 'dist';
var SERVE_FROM = path.join(process.cwd(), BASE_DIRECTORY);
var DEFAULT_INDEX = path.join(SERVE_FROM, 'index.html');

// staticFile should be rewritten
function staticFile(baseDirectory) {
  return function(req, res, next) {
    if (!req.path || req.path === '/') {
      return next();
    }

    var filePath = path.join(baseDirectory, req.path);

    fs.stat(filePath, function(err, stats) {
      if (err) {
        return next();
      }

      res.sendFile(path.join(process.cwd(), '/', filePath), function(err) {
        if (err) {
          return next(err);
        }
      });
    });
  };
}

function middleware(app) {
  app.use(staticFile(BASE_DIRECTORY));

  app.use(function translationContextBuilder(req, res, next) {
    // TODO: implement fallback to respect accept-language
    var acceptLanguage = req.get('accept-language');
    var root = path.join(SERVE_FROM, 'assets', 'translations');
    var locale = 'en';

    if (req.path.length > 1) {
      var lang = req.path.substring(1).split('/')[0].replace(/\.\./g, '');
      var hasTranslation = fs.existsSync(path.join(root, lang + '.yaml'));

      if (hasTranslation) {
        locale = lang;
        res.locals.rootURL = '/' + lang;
      }
    }

    fs.readFile(path.join(root, locale + '.yaml'), 'utf8', function(err, translations) {
      res.locals.translations = yaml.safeLoad(translations);
      res.locals.locale = locale;
      next();
    });
  });

  // much of this method is unsafe, only to demo purposes
  app.use(function catchAll(req, res, next) {
    if (req.url === '/ember-cli-live-reload.js') {
      return next();
    }

    fs.readFile(DEFAULT_INDEX, { encoding: 'utf8'}, function(err, data) {
      var $ = cheerio.load(data);

      if (res.locals.translations) {
        $('meta[name=translations]').attr('content', serialize(res.locals.translations));
      }

      $('meta[name=locale]').attr('content', res.locals.locale.toLowerCase());
      $('meta[name=rootURL]').attr('content', res.locals.rootURL || '/');

      res.status(200).send($.html());
    });
  });
}

module.exports = middleware;
