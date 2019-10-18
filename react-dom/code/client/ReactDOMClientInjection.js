/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as EventPluginHub from 'events/EventPluginHub';
import * as EventPluginUtils from 'events/EventPluginUtils';

import * as ReactDOMComponentTree from './ReactDOMComponentTree';
import BeforeInputEventPlugin from '../events/BeforeInputEventPlugin';
import ChangeEventPlugin from '../events/ChangeEventPlugin';
import DOMEventPluginOrder from '../events/DOMEventPluginOrder';
import EnterLeaveEventPlugin from '../events/EnterLeaveEventPlugin';
import SelectEventPlugin from '../events/SelectEventPlugin';
import SimpleEventPlugin from '../events/SimpleEventPlugin';

/**
 * 注入用于解析dom层次结构和插件顺序的模块。
*/
EventPluginHub.injection.injectEventPluginOrder(DOMEventPluginOrder);
EventPluginUtils.injection.injectComponentTree(ReactDOMComponentTree);

/**
 * 默认情况下包括一些重要的事件插件（不需要他们）
 */
EventPluginHub.injection.injectEventPluginsByName({
  SimpleEventPlugin: SimpleEventPlugin,
  EnterLeaveEventPlugin: EnterLeaveEventPlugin,
  ChangeEventPlugin: ChangeEventPlugin,
  SelectEventPlugin: SelectEventPlugin,
  BeforeInputEventPlugin: BeforeInputEventPlugin,
});
