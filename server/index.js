'use strict';

var serialize = require('serialize-javascript');
var cheerio = require('cheerio');
var yaml = require('js-yaml');
var path = require('path');
var fs = require('fs');

var BASE_DIRECTORY = 'dist';
var SERVE_FROM = path.join(process.cwd(), BASE_DIRECTORY);
var DEFAULT_INDEX = path.join(SERVE_FROM, 'index.html');

function meta(name, content) {
  var $ = cheerio.load('<meta name="' + name + '" />');
  return $('meta').attr('content', content);
}

function serveStatic(baseDirectory) {
  return function(req, res, next) {
    if (!path.extname(req.path)) {
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

module.exports = function(app) {
  app.use(serveStatic(BASE_DIRECTORY));

  app.use(function translationResolver(req, res, next) {
    // TODO: implement fallback to respect accept-language
    // var acceptLanguage = req.get('accept-language');
    var root = path.join(SERVE_FROM, 'assets', 'translations');
    var locale = 'en';

    if (req.path.length > 1) {
      var lang = req.path.substring(1).split('/')[0].replace(/\.\./g, '').toLowerCase();
      var hasTranslation = fs.existsSync(path.join(root, lang + '.yaml'));

      if (hasTranslation) {
        // edge-case, rootURLs need to end in a slash so
        // if the request is for /fr then redirect to /fr/
        if (req.path.toLowerCase() === '/' + lang) {
          return res.redirect(301, '/' + lang + '/');
        }

        locale = lang;
        res.locals.rootURL = '/' + lang + '/';
      }
    }

    fs.readFile(path.join(root, locale + '.yaml'), 'utf8', function(err, translations) {
      res.locals.translations = yaml.safeLoad(translations);
      res.locals.locale = locale;
      next();
    });
  });

  app.use(function outputLocals(req, res, next) {
    if (req.url === '/ember-cli-live-reload.js') {
      return next();
    }

    fs.readFile(DEFAULT_INDEX, { encoding: 'utf8'}, function(err, data) {
      var $ = cheerio.load(data);
      var $head = $('head');
      $head.append(meta('translations', serialize(res.locals.translations)));
      $head.append(meta('locale', res.locals.locale.toLowerCase()));
      $head.append(meta('rootURL', res.locals.rootURL || '/'));
      res.status(200).send($.html());
    });
  });
}
