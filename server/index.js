'use strict';

var cheerio = require('cheerio');
var path = require('path');
var fs = require('fs');
var url = require('url');

var BASE_DIRECTORY = 'dist';
var SERVE_FROM = path.join(process.cwd(), BASE_DIRECTORY);
var DEFAULT_INDEX = path.join(SERVE_FROM, 'index.html');

function middleware(app) {
  app.use(function localeResolver(req, res, next) {
    var urlPaths = req.path.split('/');
    var acceptLanguage = req.get('accept-language');
    var locale;

    if (urlPaths.length > 1) {
      var localeSegment = urlPaths[1];
      var isValidLocale = fs.existsSync(path.join(SERVE_FROM, 'locales', localeSegment + '.js'));
      locale = localeSegment;
      res.locals.rootURL = '/' + localeSegment;
    }

    if (!locale && acceptLanguage) {
      // unsafe, but this is just for demoing
      locale = acceptLanguage.split(',')[0];
    }

    res.locals.locale = locale || 'en-US';
    next();
  });

  app.use(staticFile(BASE_DIRECTORY));

  app.use(function catchAll(req, res, next) {
    fs.readFile(DEFAULT_INDEX, { encoding: 'utf8'}, function(err, data) {
      var $ = cheerio.load(data);
      $('meta[name=locale]').attr('content', res.locals.locale.toLowerCase());
      $('meta[name=rootURL]').attr('content', res.locals.rootURL || '/');
      res.status(200).send($.html());
    });
  });
}

// should be rewritten
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

module.exports = middleware;
