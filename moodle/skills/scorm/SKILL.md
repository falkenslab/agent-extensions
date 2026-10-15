---
name: scorm
description: Turn a web activity (an HTML game, a simulation, an interactive exercise) into a SCORM 1.2 package Moodle tracks - completion and a score in the gradebook - and upload, set up and test it with moodle-mcp. Use when the person wants an HTML activity graded or tracked in Moodle, or asks for SCORM.
---

# A SCORM package for Moodle

A SCORM package is a ZIP with the activity's files and an `imsmanifest.xml` at its root. In Moodle it becomes a "SCORM package" activity that plays it and records what it reports: whether the student completed it and a score for the gradebook. Without a bridge that talks to Moodle, the package only opens: nothing is recorded.

Work in a folder of its own (`package/`), with whatever file tools the agent has. Before packaging someone else's activity, check its license or ask the person.

## 1. The bridge: `package/scorm-bridge.js`

SCORM 1.2, the version every Moodle plays. Copy it as is:

```js
// scorm-bridge.js: reports this activity's progress to Moodle (SCORM 1.2).
(function () {
  "use strict";
  function find(win) {
    for (var i = 0; win && i < 10; i++) {
      if (win.API) return win.API;
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }
  var api = find(window) || (window.opener ? find(window.opener) : null);
  var open = false;
  function start() {
    if (!api || open) return;
    open = api.LMSInitialize("") === "true";
    if (api.LMSGetValue("cmi.core.lesson_status") === "not attempted") api.LMSSetValue("cmi.core.lesson_status", "incomplete");
  }
  window.SCORM = {
    available: !!api,
    // Progress as a percentage (0-100), saved at once: a student who leaves halfway keeps it.
    score: function (percent) {
      if (!api) return;
      start();
      api.LMSSetValue("cmi.core.score.min", "0");
      api.LMSSetValue("cmi.core.score.max", "100");
      api.LMSSetValue("cmi.core.score.raw", String(Math.max(0, Math.min(100, Math.round(percent)))));
      api.LMSCommit("");
    },
    // The end of the activity: "completed", or "passed"/"failed" when it has a pass mark.
    finish: function (status) {
      if (!api) return;
      start();
      api.LMSSetValue("cmi.core.lesson_status", status || "completed");
      api.LMSCommit("");
    },
  };
  start();
  window.addEventListener("pagehide", function () {
    if (api && open) { api.LMSCommit(""); api.LMSFinish(""); open = false; }
  });
})();
```

## 2. Hook it to the activity, without changing how it plays

Read the activity's scripts and find where it records progress and where it ends: functions or callbacks named like `complete`, `finish`, `win`, `gameOver`, `score`, `onComplete`; an end screen; a custom event. Then:

- add `<script src="scorm-bridge.js"></script>` **before** the activity's own scripts in its HTML (the path relative to that file), and a small `scorm-hook.js` **after** them;
- in `scorm-hook.js`, wrap what you found instead of rewriting it: call the original, then `SCORM.score(done / total * 100)` on each step and `SCORM.finish("completed")` at the end. If the activity already has a hook for this (an `onComplete` option, an event), use it.

```js
// scorm-hook.js: reports progress to Moodle through scorm-bridge.js.
(function () {
  var game = window.MyGame; // the engine object the activity creates
  var total = game.tasks.length;
  var onComplete = game.on.complete, onFinish = game.on.finish;
  game.on.complete = function () {
    if (onComplete) onComplete.apply(this, arguments);
    var done = game.tasks.filter(function (t) { return t.done; }).length;
    SCORM.score(done / total * 100);
  };
  game.on.finish = function () {
    if (onFinish) onFinish.apply(this, arguments);
    SCORM.finish("completed");
  };
})();
```

The activity must still work opened outside Moodle: the bridge does nothing without the API.

## 3. The manifest and the ZIP

`package/imsmanifest.xml`, with the launch page's path relative to `package/`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="activity-slug" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org">
    <organization identifier="org">
      <title>Activity title</title>
      <item identifier="item" identifierref="res"><title>Activity title</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
```

Zip the **contents** of `package/`, so `imsmanifest.xml` is at the archive's root, not inside a folder: Moodle rejects a package without it there.

## 4. Upload it hidden

`create_activity` with `type: "scorm"`, the ZIP as the first of `files`, hidden, in the section the person chose. Settings that make the score count (field names from `get_activity_settings` on a SCORM activity):

- grading method "Highest grade", maximum grade as the person grades (100, or 10);
- attempts unlimited unless the person says otherwise, attempts grading "Highest attempt";
- display in the current window (a new window if it needs the whole screen);
- completion, if the course uses it: status completed, or a minimum score.

## 5. Test that Moodle records it

- When the server offers `open_scorm` (role `all` or `student`): open it, do a step with the `browser_*` tools, leave, and `get_scorm`: the attempt must show a status and a score. Opening it starts a real attempt in the person's name.
- Otherwise the person opens it in normal mode (not only "Preview", which records nothing), plays a step and checks "Reports", "Attempts".

If nothing is recorded, fix the hook and zip again. To replace the package: moodle-mcp 0.3.0 replaces files only in file resources and folders, so the person uploads the new ZIP in the activity's settings ("Package file"); or, since it's a hidden draft no student has opened, delete it and upload it again, with the person's yes. Then show it with their yes (see `publishing`).
