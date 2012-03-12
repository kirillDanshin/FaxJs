/*
 * FJs User Interface toolkit.
 *
 * Copyright (c) 2011 Jordan Walke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 * I am providing code in this repository to you under an open source license.
 * Because this is my personal repository, the license you receive to my code
 * is from me and not from my employer (Facebook).
 *
 */

/**
 * FDom/FDom.js - core dom module for the FaxJs ui system. Low level building
 * blocks for javascript applications.
 */
var F = require('Fax');
var FUiStylers = require('./FUiStylers');
var FErrors = F.FErrors;
var FEvent = F.FEvent;
var FDomGeneration = F.FDomGeneration;
var FDomAttributes = F.FDomAttributes;
var FDomMutation = F.FDomMutation;
var FDom = {};

/* FDomGeneration */
var generateDomNodeAndChildren = FDomGeneration.generateDomNodeAndChildren;

/* FDomMutation */
var reconcileDomChildrenByKey = FDomMutation.reconcileDomChildrenByKey;
var reconcileDomChildrenByArray = FDomMutation.reconcileDomChildrenByArray;
var controlSingleDomNode = FDomMutation.controlSingleDomNode;

/* FDomAttributes */
var allTagAttrsAndHandlerNames = FDomAttributes.allTagAttrsAndHandlerNames;

/**
 * @makeDomContainerComponent: Creates a new javascript Class that is reactive,
 * and idempotent, capable of containing other reactive components.  It has the
 * capabilities of accepting event handlers and dom attributes. In general the
 * properties of a native tag component that is created are as follows: Event
 * handlers currently use top level event delegation exclusively in order to
 * divorce markup generation from controlling the dom (has other performance
 * benefits as well). More traditional TLED may be used at a later date.  All
 * Classes generated by this function support these in addition to others:
 *
 * --onClick:     fn  ... All events use TLED (top level event delegation)
 * --onMouseUp:   fn
 * --onMouseDown: fn ... (and many more events such as drag etc.)
 * --width:       dom tag attribute
 * --height:      "
 * --classSet:    "
 * --value:       " specially cased-rendered in tag, set on element at runtime
 * --(many more):   see *DomAttributes
 *
 * -Each native dom tag component accepts a style property as well.
 * --style: {width , height, .. }
 *
 * -Contained Children:
 *
 * -All native tag components can contain any amount of child components. The
 *  parent of the native tag component should just drop children in under any
 *  name they wish in the properties, right along side style and event
 *  handlers, so long as that name does is not reserved width/className/onClick
 *  etc..
 *
 * -Methods of specifying children: (Choose *only* one method per use)
 * --anyNameYouWant: SomeChild({..})     or
 * --childList: [SomeChild({}), AnotherChild({})]
 * --childSet: {anyNameYouWant: SomeChild({}), anyOtherName: Another({})
 *
 * -childSet is highly encouraged as it is much more powerful in terms of
 *  expressiveness (objects carry information about order and also item
 *  identity by key**)
 * -<tag id='x' ${optionalTagText} >...</tag>
 * -**Aside from one issue in Chrome browser only where keys are numeric (but
 *  you wouldn't do that anyways.
 */
var makeDomContainerComponent = exports.makeDomContainerComponent =
function(tag, optionalTagTextPar) {
  var optionalTagText =  optionalTagTextPar || '',
      tagOpen = "<" + tag + optionalTagText + " id='",
      tagClose = "</" + tag + ">",
      headTextTagClose = ">";

  var NativeComponentConstructor = function(initProps) {
    this.props = initProps;
  };

  var ConvenienceConstructor = function(propsParam) {
    var props = propsParam || this;
    return new NativeComponentConstructor(props);
  };

  /**
   * @doControl: Controls a native dom component after it has already been
   * allocated and attached to the dom.
   */
  NativeComponentConstructor.prototype.doControl = function(nextProps) {
    if (!this._rootDomId) { throw FErrors.CONTROL_WITHOUT_BACKING_DOM; }
    if (!nextProps._dontControlTopMostDom) {
      this.rootDomNode = controlSingleDomNode(
          this.rootDomNode, this._rootDomId, nextProps, this.props);
    }
    this.props = nextProps;
    if (this.props._dontControlExistingChildren) {
      return;
    }

    if (nextProps.dynamicHandlers) {
      FEvent.registerHandlers(this._rootDomId, nextProps.dynamicHandlers);
    }

    if (nextProps.childSet) {
      reconcileDomChildrenByKey.call(
          this,
          nextProps.childSet, null,
          nextProps._onlyControlChildKeys);
    } else if(nextProps.childList) {
      reconcileDomChildrenByArray.call(this, nextProps.childList);
    } else {
      reconcileDomChildrenByKey.call(
          this,
          nextProps, allTagAttrsAndHandlerNames,
          nextProps._onlyControlChildKeys);
    }
  };

  /**
   * @genMarkup: todo: The doControl method is the one responsible for
   * dispatching control to *byKey, *byArray, *. The same should be done here,
   * but it's going to be difficult to do that without sacrificing rendering
   * perf. (It would consist of breaking generateDomNodeAndChildren into two
   * methods - one for the generating the tag, and one for generating the
   * contained markup.
   */
  NativeComponentConstructor.prototype.genMarkup =
  function(idRoot, doMarkup, doHandlers) {
    /* Will also populate this._rootDomId - since it "generates node" */
    return generateDomNodeAndChildren.call(
        this,
        tagOpen,
        tagClose,
        idRoot,
        doMarkup,
        doHandlers);
  };

  return ConvenienceConstructor;
};


/**
 * Native dom "tag" components. Properties that you inject into these
 * convenience constructors correspond to either dom properties, or named
 * children. See the extensive comments above.
 */
FDom.Div = makeDomContainerComponent('div');
FDom.TextArea = makeDomContainerComponent('textarea');
FDom.Label = makeDomContainerComponent('label');
FDom.Ul = makeDomContainerComponent('ul');
FDom.Dl = makeDomContainerComponent('dl');
FDom.Dt = makeDomContainerComponent('dt');
FDom.Dd = makeDomContainerComponent('Dd');
FDom.P = makeDomContainerComponent('p');
FDom.Pre = makeDomContainerComponent('pre');
FDom.Hr = makeDomContainerComponent('hr');
FDom.Br = makeDomContainerComponent('br');
FDom.Img = makeDomContainerComponent('img');
FDom.A = makeDomContainerComponent('a');
FDom.Li = makeDomContainerComponent('li');
FDom.I = makeDomContainerComponent('i');
FDom.H1 = makeDomContainerComponent('h1');
FDom.H2 = makeDomContainerComponent('h2');
FDom.H3 = makeDomContainerComponent('h3');
FDom.H4 = makeDomContainerComponent('h4');
FDom.H5 = makeDomContainerComponent('h5');
FDom.H6 = makeDomContainerComponent('h6');
FDom.Span = makeDomContainerComponent('span');
FDom.Input = makeDomContainerComponent('input');
FDom.Button = makeDomContainerComponent('button');
FDom.Table = makeDomContainerComponent('table');
FDom.Tr = makeDomContainerComponent('tr');
FDom.Th = makeDomContainerComponent('th');
FDom.Td = makeDomContainerComponent('td');
FDom.IFrame = makeDomContainerComponent('iframe');
FDom.stylers = FUiStylers;
module.exports = FDom;
