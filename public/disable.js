function disableCtrlKeyCombination(e) {
  var forbiddenKeys = new Array('a', 's', 'c', 'u', 'i');
  var key;
  var isCtrl;
  if (window.event) {
    key = window.event.keyCode;
    if (window.event.ctrlKey) isCtrl = true;
    else isCtrl = false;
  } else {
    key = e.which;
    if (e.ctrlKey) isCtrl = true;
    else isCtrl = false;
  }
  if (isCtrl) {
    for (i = 0; i < forbiddenKeys.length; i++) {
      if (forbiddenKeys[i].toLowerCase() == String.fromCharCode(key).toLowerCase()) {
        return false;
      }
    }
  }
  return true;
}

var message = 'Sorry, right-click has been disabled';
function clickIE() {
  if (document.all) {
    message;
    return false;
  }
}
function clickNS(e) {
  if (document.layers || (document.getElementById && !document.all)) {
    if (e.which == 2 || e.which == 3) {
      message;
      return false;
    }
  }
}
if (document.layers) {
  document.captureEvents(Event.MOUSEDOWN);
  document.onmousedown = clickNS;
} else {
  document.onmouseup = clickNS;
  document.oncontextmenu = clickIE;
}
document.oncontextmenu = new Function('return false');

document.onkeypress = function (event) {
  event = event || window.event;
  if (event.keyCode == 123) {
    return false;
  }
};
document.onmousedown = function (event) {
  event = event || window.event;
  if (event.keyCode == 123) {
    return false;
  }
};
document.onkeydown = function (event) {
  event = event || window.event;
  if (event.keyCode == 123) {
    return false;
  }
};
