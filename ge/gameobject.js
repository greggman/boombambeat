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
 * @fileoverview This file contains the 'GameObject' object implemenation.
 */

tdl.provide('ge.gameobject');

/**
 * A Game Object is just a bucket of components and shared public properties.
 * @constructor
 */
ge.GameObject = function() {
  this.components = {};
  this.publicProperties = {};
}

ge.GameObject.prototype.destroy = function() {
  // since we're going to be removing properties I'm guessing I need
  // to get the list of properties before I start.
  var props = [];
  for (var name in this.components) {
    props.push(name);
  }
  for (var ii = 0; ii < props.length; ++ii) {
    //tdl.log("remove: " + props[ii]);
    this.removeComponent(props[ii]);
  }
  ge.game.removeObject(this);
};

ge.GameObject.prototype.addComponent = function(component) {
  this.components[component.name] = component;
};

ge.GameObject.prototype.removeComponent = function(nameOrComponent) {
  var name;
  var component;
  if (typeof nameOrComponent == "string") {
    name = nameOrComponent;
    component = this.components[name];
  } else {
    component = nameOrComponent;
    name = component.name;
  }
  delete this.components[name];
  if (component.destroy) {
    component.destroy();
  }
  if (component.removeFromSystem) {
    component.removeFromSystem();
  }
  component.clearGameObject(this);
};

ge.GameObject.prototype.addPublicProperties = function(obj) {
  // TODO(gman): this probably needs to be a deep copy.
  var pp = this.publicProperties;
  for (var prop in obj) {
    if (pp[prop] == undefined) {
      pp[prop] = obj[prop];
    }
  }
};




