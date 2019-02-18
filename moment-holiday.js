//! moment-holiday.js
//! version : 1.5.1
//! author : Kodie Grantham
//! license : MIT
//! https://github.com/kodie/moment-holiday

(function (root, factory) {
  "use strict";

  /*global define*/
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('moment')); // Node
  } else if (typeof define === 'function' && define.amd) {
    define(['moment'], factory);                 // AMD
  } else {
    factory(root.moment);                        // Browser
  }
}(this, function (moment) {
  var parserExtensions = [];

  var parseHoliday = function(self, date, adjust) {
    var days = [], pd;

    for (var i = 0; i < parserExtensions.length; i++) {
      var pe = parserExtensions[i](self, date);
      if (pe || pe === false) { pd = pe; }
    }

    if (pd === false) { return false; }
    if (typeof pd === 'string') { date = pd; } else if (pd) { days = pd; }

    if (!moment.isMoment(days) && !days.length && date.charAt(0).match(/[0-9(]/)) {
      var range = false;
      var dates = date.split('|');

      if (dates.length > 1) { range = true; }
      if (dates.length > 2) { dates = [dates[0], dates[1]]; }

      for (var i = 0; i < dates.length; i++) {
        var m = moment(self);
        var ds = dates[i].split('/');

        if (ds.length === 1 || (ds.length === 2 && ds[1].charAt(0) !== '(' && ds[1].length === 4)) {
          var td = dates[i];
          i = -1;
          dates = [];
          for (var ii = 1; ii < 13; ii++) { dates.push(ii + '/' + td); }
          continue;
        }

        if (ds.length > 2) { m.year(parseInt(ds[2])); }

        m.month((parseInt(ds[0]) - 1));

        if (ds[1].charAt(0) === '(') {
          var w = ds[1].slice(1, -1).split(',');
          var wd = parseInt(w[0]);
          var dt = parseInt(w[1]);
          var d = moment(m).startOf('month');
          var limit = (moment(m).endOf('month').diff(d, 'days') + 1);
          var wds = [];

          if (w[1] && w[1].charAt(0) === '[') {
            var forward = true;
            dt = parseInt(w[1].slice(1, -1));

            if (dt < 0) {
              forward = false;
              dt = parseInt(w[1].slice(2, -1));
            }

            d = moment(m).date(dt);

            for (var wi = 0; wi < 7; wi++) {
              if (d.day() === wd) { days.push(moment(d)); break; }

              if (forward) {
                d.add(1, 'day');
              } else {
                d.subtract(1, 'day');
              }
            }

            continue;
          }

          for (var ai = 0; ai < limit; ai++) {
            if (d.day() === wd) { wds.push(moment(d)); }
            d.add(1, 'day');
          }

          if (!dt) {
            days = days.concat(wds);
            continue;
          } else if (dt < 0) {
            m = wds[wds.length + dt];
          } else {
            m = wds[dt - 1];
          }

          days.push(m);
        } else {
          days.push(m.date(ds[1]));
        }
      }

      if (range && days.length > 1) {
        var diff = days[1].diff(days[0], 'days');

        if (diff > 1) {
          var di = moment(days[0]);
          days = [days[0]];

          for (var i = 0; i < diff; i++) {
            di.add(1, 'day');
            days.push(moment(di));
          }
        }
      }
    }

    days = arrayify(days);

    for (var i = 0; i < days.length; i++) {
      if (!moment.isMoment(days[i])) { delete(days[i]); continue; }

      if (adjust) {
        if (days[i].day() === 0) { days[i] = days[i].add(1, 'day'); }
        if (days[i].day() === 6) { days[i] = days[i].subtract(1, 'day'); }
      }

      days[i] = days[i].startOf('day');
    }

    if (!days.length) { return false; }
    if (days.length === 1) { return days[0]; }

    return days;
  };

  var keywordMatches = function(str, kw) {
    var m = [];
    kw = arrayify(kw);

    for (var i = 0; i < kw.length; i++) {
      var f = str.match(new RegExp(kw[i], 'gi'));
      if (f) { m = m.concat(f); }
    }

    return m;
  };

  var findHoliday = function(self, holiday, adjust, parse, holidayObj) {
    var pt = {};
    var wn = [];
    var obj = {};

    h = holidayObj || moment.holidays.active;

    if (h.hasOwnProperty(holiday)) {
      wn.push(holiday);
    } else if (fk = findKey(holiday, h)) {
      wn.push(fk);
    } else {
      for (var hd in h) {
        if (!h.hasOwnProperty(hd)) { continue; }

        pt[hd] = keywordMatches(holiday, hd.split(/[\s,.-]+/).filter(function(w){ return w.length > 2; })).length;

        if (h[hd].keywords_n) {
          var matchesN = keywordMatches(holiday, h[hd].keywords_n);
          if (matchesN.length) {
            pt[hd] = 0;
            continue;
          }
        }

        if (h[hd].keywords_y) {
          var matchesY = keywordMatches(holiday, h[hd].keywords_y);
          if (matchesY && matchesY.length === h[hd].keywords_y.length) {
            pt[hd] += matchesY.length;
          } else {
            pt[hd] = 0;
            continue;
          }
        }

        if (h[hd].keywords) {
          var matches = keywordMatches(holiday, h[hd].keywords);
          if (matches) {
            pt[hd] += matches.length;
          } else {
            continue;
          }
        }
      }

      //console.log(pt); // Display scores

      for (var w in pt) {
        if (!pt[w] || !pt.hasOwnProperty(w)) { continue; }
        if (!wn.length || pt[w] === pt[wn[0]]) { wn.push(w); continue; }
        if (pt[w] > pt[wn[0]]) { wn = [w]; continue; }
      }
    }

    if (!wn.length) { return false; }

    if (parse !== false) {
      for (var i = 0; i < wn.length; i++) {
        var d = parseHoliday(self, h[wn[i]].date, adjust);
        if (d) { obj[wn[i]] = d; }
      }

      if (Object.keys(obj).length) { return obj; }
    } else {
      return wn;
    }

    return false;
  };

  var findHolidays = function(self, holidays, adjust, parse, holidayObj) {
    var h = [];
    if (parse) { h = {}; }

    holidays = arrayify(holidays);
    if (!holidayObj) { holidayObj = moment.holidays.active; }

    for (var i = 0; i < holidays.length; i++) {
      var find = findHoliday(self, holidays[i], adjust, parse, holidayObj);

      if (find) {
        if (parse) {
          h = merge(h, find);
        } else {
          h = h.concat(find);
        }
      }
    }

    return h;
  };

  var getAllHolidays = function(self, adjust) {
    var h = moment.holidays.active;
    var d = {};

    for (var hd in h) {
      if (!h.hasOwnProperty(hd)) { continue; }
      if (td = parseHoliday(self, h[hd].date, adjust)) { d[hd] = td; }
    }

    return d;
  };

  var compileRegions = function(locale, regions) {
    var h = moment.holidays[locale];
    var o = {};

    if (h) {
      for (var i = 0; i < regions.length; i++) {
        var r = regions[i].toLowerCase();
        var l = moment.holidays[locale + '/' + r];
        l = {};

        for (var hd in h) {
          if (!h.hasOwnProperty(hd)) { continue; }

          var y = h[hd].regions || [];
          var n = h[hd].regions_n || [];

          if (y.length) { y.join().toLowerCase().split(); }
          if (n.length) { n.join().toLowerCase().split(); }

          if ((!y.length && !n.length) || (y.length && ~y.indexOf(r)) || (n.length && !~n.indexOf(r))) {
            l[hd] = h[hd];
          }
        }

        if (l) { o = merge(o, l); }
      }
    }

    if (!Object.keys(o).length) { return false; }

    return o;
  };

  var getLocale = function(locale) {
    regions = locale.split('/');
    locale = regions[0].toLowerCase().replace(' ', '_');
    regions.shift();

    if (moment.holidays[locale]) {
      if (regions.length) { return compileRegions(locale, regions); }
      return moment.holidays[locale];
    } else {
      console.error("Unsupported locale in moment-holiday: "+locale);
    }

    return false;
  };

  var holidayLoop = function(self, count, forward, adjust) {
    if (!count) { count = 1; }

    var h = getAllHolidays(self, adjust);
    var l = moment(self);
    var y = self.year();
    var w = [];

    for (var i = 0; i < count; i++) {
      var d = moment(l);

      while (true) {
        var b = false;

        if (forward) {
          d.add(1, 'day');
        } else {
          d.subtract(1, 'day');
        }

        if (d.year() !== y) {
          h = getAllHolidays(d, adjust);
          y = d.year();
        }

        if (!Object.keys(h).length) { b = true; break; }

        for (var hd in h) {
          if (!h.hasOwnProperty(hd)) { continue; }

          var b2 = false;
          var ha = arrayify(h[hd]);

          for (var hi = 0; hi < ha.length; hi++) {
            if (d.isSame(ha[hi], 'day')) {
              w.push(ha[hi]);
              l = moment(d);
              b2 = true;
              break;
            }
          }

          if (b2) { b = true; break; }
        }

        if (b) { break; }
      }
    }

    if (!w.length) { return false; }
    if (w.length === 1) { return w[0]; }

    return w;
  };

  var arrayify = function(arr) {
    if (arr && arr.constructor !== Array) { return [arr]; }
    return arr;
  };

  var findKey = function(find, obj) {
    if (obj.constructor === Object) { obj = Object.keys(obj); }
    for (var i = 0; i < obj.length; i++) {
      if (find.toLowerCase() === obj[i].toLowerCase()) { return obj[i]; }
    }
    return false;
  };

  var merge = function(o1, o2) {
    return Object.assign({}, o1, o2);
  };

  moment.fn.holiday = function(holidays, adjust) {
    var h = moment.holidays.active;
    var d = {};
    var single = false;

    if (!holidays) {
      d = getAllHolidays(this, adjust);
    } else {
      if (holidays.constructor !== Array) {
        single = true;
        holidays = [holidays];
      }

      for (var i = 0; i < holidays.length; i++) {
        if (td = findHoliday(this, holidays[i], adjust)) { d = Object.assign({}, d, td); }
      }
    }

    var dKeys = Object.keys(d);

    if (!dKeys.length) { return false; }
    if (dKeys.length === 1 && single) { return d[dKeys[0]]; }

    return d;
  };

  moment.fn.holidays = function(holidays, adjust) {
    return this.holiday(holidays, adjust);
  };

  moment.fn.isHoliday = function(holidays, adjust) {
    var h, returnTitle, hs = [];

    if (holidays) {
      holidays = arrayify(holidays);
      h = this.holiday(holidays, adjust);
      returnTitle = false;
    } else {
      h = getAllHolidays(this, adjust);
      returnTitle = true;
    }

    if (!h) { return false; }

    for (var hd in h) {
      if (!h.hasOwnProperty(hd)) { continue; }

      var ha = arrayify(h[hd]);

      for (var hi = 0; hi < ha.length; hi++) {
        if (this.isSame(ha[hi], 'day')) {
          if (returnTitle) {
            hs.push(hd);
          } else {
            return true;
          }
        }
      }
    }

    if (hs.length) {
      if (hs.length === 1) { return hs[0]; }
      return hs;
    }

    return false;
  };

  moment.fn.previousHoliday = function(count, adjust) {
    return holidayLoop(this, count, false, adjust);
  };

  moment.fn.previousHolidays = function(count, adjust) {
    return this.previousHoliday(count, adjust);
  };

  moment.fn.nextHoliday = function(count, adjust) {
    return holidayLoop(this, count, true, adjust);
  };

  moment.fn.nextHolidays = function(count, adjust) {
    return this.nextHoliday(count, adjust);
  };

  moment.fn.holidaysBetween = function(date, adjust) {
    if (!date) { date = new Date(); }
    date = moment(date).subtract(1, 'day');

    var h = getAllHolidays(this, adjust);
    var d = moment(this);
    var y = d.year();
    var w = [];

    for (var i = 0; i < date.diff(this, 'days'); i++) {
      d.add(1, 'day');

      if (d.year() !== y) {
        h = getAllHolidays(d, adjust);
        y = d.year();
      }

      if (!Object.keys(h).length) { break; }

      for (var hd in h) {
        var b = false;
        var ha = arrayify(h[hd]);

        for (var hi = 0; hi < ha.length; hi++) {
          if (d.isSame(ha[hi], 'day')) {
            w.push(ha[hi]);
            b = true;
            break;
          }
        }

        if (b) { break; }
      }
    }

    if (!w.length) { return false; }

    return w;
  };

  moment.holidays = {
    active: {},
    active_last: {}
  };

  moment.modifyHolidays = {
    set: function(holidays, specifics) {
      var newH = {};

      if (holidays.constructor === Array) {
        var hs = [];

        for (var i = 0; i < holidays.length; i++) {
          var d = findHoliday(this, holidays[i], null, false);
          if (d) { hs = hs.concat(d); }
        }

        if (hs.length) {
          newH = merge(moment.holidays.active);

          for (var hd in newH) {
            if (!newH.hasOwnProperty(hd)) { continue; }
            if (!~hs.indexOf(hd)) { delete(newH[hd]); }
          }
        }
      } else if (typeof holidays === 'string') {
        var locale = getLocale(holidays);

        if (locale) {
          if (specifics) {
            var k = findHolidays(this, specifics, false, false, locale);
            for (var i = 0; i < k.length; i++) { newH[k[i]] = merge(locale[k[i]]); }
          } else {
            newH = merge(locale);
          }
        }
      } else {
        newH = holidays;
      }

      if ((Object.keys(newH).length || holidays === newH) && !Object.is(moment.holidays.active, newH)) {
        moment.holidays.active_last = merge(moment.holidays.active);
        moment.holidays.active = newH;
      }

      return this;
    },

    add: function(holidays, specifics) {
      if (typeof holidays === 'string') {
        var locale = getLocale(holidays);
        holidays = {};

        if (locale) {
          if (specifics) {
            var k = findHolidays(this, specifics, false, false, locale);
            for (var i = 0; i < k.length; i++) { holidays[k[i]] = merge(locale[k[i]]); }
          } else {
            holidays = locale;
          }
        }
      }

      if (Object.keys(holidays).length) {
        moment.holidays.active_last = merge(moment.holidays.active);
        moment.holidays.active = merge(moment.holidays.active, holidays);
      }

      return this;
    },

    remove: function(holidays) {
      holidays = arrayify(holidays);

      var find = findHolidays(this, holidays, false, false);
      var newH = merge(moment.holidays.active);

      if (find) {
        for (var i = 0; i < find.length; i++) { delete(newH[find[i]]); }
      }

      if (!Object.is(moment.holidays.active, newH)) {
        moment.holidays.active_last = merge(moment.holidays.active);
        moment.holidays.active = newH;
      }

      return this;
    },

    undo: function() {
      var c = merge(moment.holidays.active);
      moment.holidays.active = merge(moment.holidays.active_last);
      moment.holidays.active_last = c;
      return this;
    },

    load: function(locales) {
      locales = arrayify(locales);
      for (var i = 0; i < locales.length; i++) { getLocale(locales[i]); }
      return this;
    },

    extendParser: function(func) {
      parserExtensions.push(func);
      return this;
    }
  };

  // Calculations for Easter:
  var easter = function(y) {
    var a = y % 19;
    var b = Math.floor(y/100);
    var c = y % 100;
    var d = Math.floor(b/4);
    var e = b % 4;
    var f = Math.floor((b+8)/25);
    var g = Math.floor((b-f+1)/3);
    var h = (19*a+b-d-g+15) % 30;
    var i = Math.floor(c/4);
    var k = c % 4;
    var l = (32+2*e+2*i-h-k) % 7;
    var m = Math.floor((a+11*h+22*l)/451);
    var n = Math.floor((h+l-7*m+114)/31);
    var p = (h+l-7*m+114) % 31;
    p = Math.round(p+1);

    // n = month, p = date
    return moment([y, (n - 1), p]);
  }

  /*var easter = function(y) {
    var c = Math.floor(y / 100);
    var n = y - 19 * Math.floor(y / 19);
    var k = Math.floor((c - 17) / 25);
    var i = c - Math.floor(c / 4) - Math.floor((c - k) / 3) + 19 * n + 15;
    i = i - 30 * Math.floor((i / 30));
    i = i - Math.floor(i / 28) * (1 - Math.floor(i / 28) * Math.floor(29 / (i + 1)) * Math.floor((21 - n) / 11));
    var j = y + Math.floor(y / 4) + i + 2 - c + Math.floor(c / 4);
    j = j - 7 * Math.floor(j / 7);
    var l = i - j;
    var m = 3 + Math.floor((l + 40) / 44);
    var d = l + 28 - 31 * Math.floor(m / 4);
    return moment([y, (m - 1), d]);
  };*/

  moment.modifyHolidays.extendParser(function(m, date){
    if (~date.indexOf('easter')) {
      var dates = date.split('|');
      var ds = [];

      for (i = 0; i < dates.length; i++) {
        if (dates[i].substring(0, 6) === 'easter') {
          var e = easter(m.year());

          if (dates[i].charAt(6) === '-') { e.subtract(dates[i].substring(7), 'days'); }
          if (dates[i].charAt(6) === '+') { e.add(dates[i].substring(7), 'days'); }

          if (dates.length === 1) { return e; }
          ds.push(e.format('M/D'));
        } else {
          ds.push(dates[i]);
        }
      }

      if (ds.length) { return ds.join('|'); }
    }
  });

	// LOCALES

	return moment;
}));
