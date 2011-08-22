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
 * @fileoverview This file contains the 'Game' object implemenation.
 */

tdl.provide('ge.game');

tdl.require('tdl.webgl');

/**
 * A module for game.
 * @namespace
 */
ge.game = ge.game || {};

/**
 * This is main game.
 * @constructor
 */
function Game() {
  this.objects = [];
  this.systems = [];
  this.sys = {};  // systems by name
  this.objectsToRemove = [];
  this.tickCount = 0;

  this.then = (new Date()).getTime() * 0.001;
  this.tick();
};

Game.prototype.tick = function() {
  ++this.tickCount;
  var now = (new Date()).getTime() * 0.001;
  var elapsedTime = now - this.then;
  this.then = now;

  this.process(elapsedTime);

  if (!g_drawOnce) {
    var that = this;
    tdl.webgl.requestAnimationFrame(function() {
      that.tick();
    }, canvas);
  }

  // turn off logging after 1 frame.
  g_logGLCalls = false;
};

Game.prototype.process = function(elapsedTime) {
  var numSystems = this.systems.length;
  for (var ii = 0; ii < numSystems; ++ii) {
    this.systems[ii].process(elapsedTime);
  }

  var numToRemove = this.objectsToRemove.length;
  for (var ii = 0; ii < numToRemove; ++ii) {
    this.objects.splice(this.indexOf(this.objectsToRemove[ii]), 1);
  }
  this.objectsToRemove = [];
};

Game.prototype.addSystem = function(name, system) {
  this.systems.push(system);
  this.sys[name] = system;
};

Game.prototype.addObject = function(object) {
  this.objects.push(object);
};

Game.prototype.removeObject = function(object) {
  this.objectsToRemove.push(object);
};




