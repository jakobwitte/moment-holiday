var argv = require('yargs').argv,
  fs = require('fs'),
  merge = require('merge-stream'),
  gulp = require('gulp'),
  gulpif = require('gulp-if'),
  inject = require('gulp-inject-string'),
  concat = require('gulp-concat'),
  rename = require('gulp-rename'),
  sourcemaps = require('gulp-sourcemaps'),
  uglify = require('gulp-uglify');

function generate(locales, set, minify, filename) {
  var localePaths = [], localeSrc = [], srcFile = ['moment-holiday.js'];

  if (locales && locales.length) {
    if (locales.constructor !== Array) { locales = [locales]; }
    localePaths = locales.map(function(l){
      return 'locale/' + l.toLowerCase().replace(' ', '_') + '.js';
    });

    localePaths.forEach(function(l) {
      localeSrc.push(fs.readFileSync(l, "utf8"));
    });
  }

  if (!set && locales && locales.length === 1) { set = [locales[0]]; }

  if (set) {
    if (set.constructor !== Array) { set = [set]; }
    set.forEach(function(s) {
      localeSrc.push('  moment.modifyHolidays.add("' + s + '");');
    });
  }

  return gulp.src(srcFile)
    .pipe(gulpif(minify, sourcemaps.init()))
    .pipe(concat(filename || 'moment-holiday-custom.js'))
    .pipe(gulpif(localeSrc.length > 0, inject.after('// LOCALES', '\n\n'+localeSrc.join('\n\n'))))
    .pipe(gulpif(minify, uglify({output: {comments: '/^!/'}})))
    .pipe(gulpif(minify, rename({ extname: '.min.js' })))
    .pipe(gulpif(minify, sourcemaps.write('.')))
    .pipe(gulp.dest('build/'));
}

gulp.task('default', function() {
  return generate(argv.locale, argv.set, argv.min, argv.name);
});

gulp.task('build', function() {
  var locales = [];
  var localePath = require('path').join(__dirname, 'locale');
  require('fs').readdirSync(localePath).forEach(function(file){
    var locale = file.substring(0, file.lastIndexOf('.'));
    locales.push(locale);
  });

  var src = generate(null, null, true, 'moment-holiday.js');
  var usSrc = generate('US', 'US', true, 'moment-holiday-us.js');
  var allSrc = generate(locales, 'US', true, 'moment-holiday-all.js');

  return merge(src, usSrc, allSrc);
});
