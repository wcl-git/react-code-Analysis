
import warning from 'fbjs/lib/warning';

const didWarnStateUpdateForUnmountedComponent = {};

// 针对开发环境，如果 对 this.state 赋值，将会发出警告，
function warnNoop(publicInstance, callerName) {
  if (__DEV__) {
    const constructor = publicInstance.constructor;
    const componentName =
      (constructor && (constructor.displayName || constructor.name)) ||
      'ReactClass';
    const warningKey = `${componentName}.${callerName}`;
    if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
      return;
    }
    warning(
      false,
      "Can't call %s on a component that is not yet mounted. " +
        'This is a no-op, but it might indicate a bug in your application. ' +
        'Instead, assign to `this.state` directly or define a `state = {};` ' +
        'class property with the desired state in the %s component.',
      callerName,
      componentName,
    );
    didWarnStateUpdateForUnmountedComponent[warningKey] = true;
  }
}

// 这是更新队列的抽象api
// 你会发现 这个对象里的函数，在这里只是定义了参数的意义，其实啥也没有做，是不是有点奇怪。逻辑哪里去了，往后看，后面补上
const ReactNoopUpdateQueue = {
  /**
   * 检查是否挂载此组件
   * publicInstance 我们要检测的实例
   * 返回值为 true 表示已挂在，false 表示未挂在，或者返回其他
   * 默认返回 false
   */
  isMounted: function(publicInstance) {
    return false;
  },

  /**
   * 确定组件**不是**在一个dom事务中，强制更新，这里的强制更新是指不是调用 setState 的自动更新
   * 当你知道组件状态已更改，但没有调用 setState
   * 这不会调用“shouldcomponentupdate”，但它将调用
   * componentwillupdate和componentdidupdate
   * publicInstance 应该重新渲染的实例.
   * callback 组件更新后回调函数.
   * callerName 公共api中调用函数的名称.
   */
  enqueueForceUpdate: function(publicInstance, callback, callerName) {
    warnNoop(publicInstance, 'forceUpdate');
  },

  /**
   * 取代了所有的state。始终使用此或“setState”来改变状态。
   *  你应该把“this.state”当作不可变的，不要对 this.state 赋值 
   *
   * 该方法不能保证“this.state”会立即更新
   * 因此，调用此方法后访问“this.state”可能会返回旧值
   *
   * publicInstance 应该重新渲染的实例.
   * completeState 下一个 state， 就是最新 state.
   * callback 组件更新后回调函数
   * callerName 公共api中调用函数的名称.
   */
  enqueueReplaceState: function(
    publicInstance,
    completeState,
    callback,
    callerName,
  ) {
    warnNoop(publicInstance, 'replaceState');
  },

  /**
   * 设置 state 的子集 这只是因为 _pendingState 是内部的。
   * 这提供了一种合并策略，但深层属性无法使用该策略，这会造成混淆。意思就是，state 层级有深层嵌套，将不能使用合并策略
   * 注意: 说明： PendingState 状态或合并过程中，都不要使用 enqueueSetState 这个方法
   * publicInstance 应该重新渲染的实例.
   * partialState 下一个要与 state 合并的那部分 state.
   * callback 组件更新后回调函数
   * callerName 公共api中调用函数的名称.
   */
  enqueueSetState: function(
    publicInstance,
    partialState,
    callback,
    callerName,
  ) {
    warnNoop(publicInstance, 'setState');
  },
};

export default ReactNoopUpdateQueue;
