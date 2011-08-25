/*
 * Copyright 2011, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains the 'InputManager' implemenation.
 */

tdl.provide('ge.inputmanager');

tdl.require('ge.gamesystem');

/**
 * Processes Mouse Events
 * @constructor
 */
ge.InputManager = function(element) {
  this.element = element;
  this.mouseX = 0;
  this.mouseY = 0;
  this.mouseDown = false;
  this.mouseJustUp = false;
  this.mouseJustDown = false;
  this.clearTimer = 0;

  var that = this;

  element.addEventListener('mouseup', function(e) {
    that.handleMouseUp(e);
  }, false);
  element.addEventListener('mousedown', function(e) {
    that.handleMouseDown(e);
  }, false);
  element.addEventListener('mousemove', function(e) {
    that.handleMouseMove(e);
  }, false);
  element.addEventListener('mouseout', function(e) {
    that.handleMouseOut(e);
  }, false);
};

ge.InputManager.prototype.handleMouseUp = function(event) {
  this.updatePosition(event);
  if (this.mouseDown) {
    this.mouseDown = false;
    this.mouseJustUp = true;
    this.clearTimer = 1000 / 30;
  }
};

ge.InputManager.prototype.handleMouseDown = function(event) {
  this.updatePosition(event);
  if (!this.mouseDown) {
    this.mouseDown = true;
    this.mouseJustDown = true;
    this.clearTimer = 1000 / 30;
  }
};

ge.InputManager.prototype.handleMouseMove = function(event) {
  this.updatePosition(event);
};

ge.InputManager.prototype.handleMouseOut = function(event) {
  this.mouseDown = false;
};

(function(){

  /**
   * Returns the absolute position of an element for certain browsers.
   * @param {HTML Element} element The element to get a position for.
   * @return {Object} An object containing x and y as the absolute position
   *     of the given element.
   */
  var getAbsolutePosition = function(element) {
    var r = { x: element.offsetLeft, y: element.offsetTop };
    if (element.offsetParent) {
      var tmp = getAbsolutePosition(element.offsetParent);
      r.x += tmp.x;
      r.y += tmp.y;
    }
    return r;
  };

   /**
    * Retrieve the coordinates of the given event relative to the center
    * of the widget.
    *
    * @param {eventInfo} eventInfo As returned from
    *     CLIENT3DJS.util.getEventInfo.
    * @param {HTML Element} opt_reference A DOM element whose position we want
    *     to transform the mouse coordinates to. If it is not passed in the
    *     element in the eventInfo will be used.
    * @return {Object} An object containing keys 'x' and 'y'.
    */
  var getRelativeCoordinates = function(eventInfo, opt_reference) {
    var x, y;
    var event = eventInfo.event;
    var element = eventInfo.element;
    var reference = opt_reference || eventInfo.element;
    if (!window.opera && typeof event.offsetX != 'undefined') {
      // Use offset coordinates and find common offsetParent
      var pos = { x: event.offsetX, y: event.offsetY };
      // Send the coordinates upwards through the offsetParent chain.
      var e = element;
      while (e) {
        e.mouseX = pos.x;
        e.mouseY = pos.y;
        pos.x += e.offsetLeft;
        pos.y += e.offsetTop;
        e = e.offsetParent;
      }
      // Look for the coordinates starting from the reference element.
      var e = reference;
      var offset = { x: 0, y: 0 }
      while (e) {
        if (typeof e.mouseX != 'undefined') {
          x = e.mouseX - offset.x;
          y = e.mouseY - offset.y;
          break;
        }
        offset.x += e.offsetLeft;
        offset.y += e.offsetTop;
        e = e.offsetParent;
      }
      // Reset stored coordinates
      e = element;
      while (e) {
        e.mouseX = undefined;
        e.mouseY = undefined;
        e = e.offsetParent;
      }
    } else {
      // Use absolute coordinates
      var pos = getAbsolutePosition(reference);
      x = event.pageX - pos.x;
      y = event.pageY - pos.y;
    }
    // Subtract distance to middle
    return { x: x, y: y };
  };

  var getEventInfo = function(event) {
    event = event ? event : window.event;
    var element = event.target ? event.target : event.srcElement;
    return {
      event: event,
      element: element,
      name: (element.id ? element.id : ('->' + element.toString())),
      wheel: (event.detail ? event.detail : -event.wheelDelta),
      shift: (event.modifiers ? (event.modifiers & Event.SHIFT_MASK) : event.shiftKey)
    };
  };

  ge.InputManager.prototype.updatePosition = function(event) {
    var info = getEventInfo(event);
    var m = getRelativeCoordinates(info);
    this.mouseX = m.x;
    this.mouseY = m.y;
  };
}());

ge.InputManager.prototype.process = function(elapsedTime) {
  if (this.clearTimer > 0) {
    this.clearTimer -= elapsedTime;
    if (this.clearTime <= 0) {
      this.mouseJustUp = false;
      this.mouseJustDown = false;
    }
  }
};






