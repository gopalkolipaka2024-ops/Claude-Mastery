// Store hours: every day, 7:00am to 10:00pm, Quincy (America/New_York).
(function () {
  var OPEN = 7, CLOSE = 22;
  var parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23"
  }).formatToParts(new Date());
  var get = function (t) { var p = parts.find(function (x) { return x.type === t; }); return p ? p.value : ""; };
  var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  var mins = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);

  var row = document.querySelector('#hours tr[data-day="' + day + '"]');
  if (row) row.className = "today";

  var status = document.getElementById("status");
  if (status && !isNaN(mins)) {
    var open = mins >= OPEN * 60 && mins < CLOSE * 60;
    status.textContent = open ? "Open now · until 10pm" : "Closed now · opens 7am";
    if (open) status.className = "status open";
    status.hidden = false;
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
