'use strict';

const serialize = require('serialize-javascript');
const cheerio = require('cheerio');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs');

const BASE_DIRECTORY = 'dist';
const SERVE_FROM = path.join(process.cwd(), BASE_DIRECTORY);
const DEFAULT_INDEX = path.join(SERVE_FROM, 'index.html');

function meta(name, content) {
  const $ = cheerio.load('<meta name="' + name + '" />');
  
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

  app.use(function setupIntlResponseState(req, res, next) {
    // TODO: implement fallback.  i.e., reading accept-language header
    const root = path.join(SERVE_FROM, 'assets', 'translations');
    let locale = 'en';

    if (req.path.length > 1) {
      // TODO: probably insecure
      const lang = req.path.substring(1).split('/')[0].replace(/\.\./g, '').toLowerCase();
      
      // TODO: ineffecient and not correct
      const hasTranslations = fs.existsSync(path.join(root, lang));

      if (hasTranslations) {
        // edge-case, rootURLs need to end in a slash so
        // if the request is for /fr then redirect to /fr/
        if (req.path.toLowerCase() === '/' + lang) {
          return res.redirect(301, '/' + lang + '/');
        }

        locale = lang;
        res.locals.rootURL = '/' + lang + '/';
      }
    }
    
    res.locals.locale = locale;

    fs.readFile(path.join(root, locale + '.yaml'), 'utf8', function(_, translations) {
      res.locals.translations = yaml.safeLoad(translations);
      next();
    });
  });

  app.use(function writeIntlStateToDom(req, res, next) {
    if (req.url === '/ember-cli-live-reload.js') {
      return next();
    }

    fs.readFile(DEFAULT_INDEX, { encoding: 'utf8'}, function(err, data) {
      const $ = cheerio.load(data);
      const $head = $('head');

      $head.append(meta('translations', serialize(res.locals.translations)));
      $head.append(meta('locale', res.locals.locale.toLowerCase()));
      $head.append(meta('rootURL', res.locals.rootURL || '/'));
      res.status(200).send($.html());
    });
  });
}
