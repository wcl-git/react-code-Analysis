

import {REACT_FORWARD_REF_TYPE, REACT_MEMO_TYPE} from 'shared/ReactSymbols';

import warningWithoutStack from 'shared/warningWithoutStack';
// 这段代码意思是首先，forwardRef 函数以一个函数为参数，且这个参数的函数有两个参数，类型以决定
export default function forwardRef<Props, ElementType: React$ElementType>(
  render: (props: Props, ref: React$Ref<ElementType>) => React$Node, //  这个函数参数返回reactnode
) {
  // 这里就是一些警告
  if (__DEV__) {
    if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
      warningWithoutStack(
        false,
        'forwardRef requires a render function but received a `memo` ' +
          'component. Instead of forwardRef(memo(...)), use ' +
          'memo(forwardRef(...)).',
      );
    } else if (typeof render !== 'function') {
      warningWithoutStack(
        false,
        'forwardRef requires a render function but was given %s.',
        render === null ? 'null' : typeof render,
      );
    } else {
      warningWithoutStack(
        // Do not warn for 0 arguments because it could be due to usage of the 'arguments' object
        render.length === 0 || render.length === 2,
        'forwardRef render functions accept exactly two parameters: props and ref. %s',
        render.length === 1
          ? 'Did you forget to use the ref parameter?'
          : 'Any additional parameter will be undefined.',
      );
    }

    if (render != null) {
      warningWithoutStack(
        render.defaultProps == null && render.propTypes == null,
        'forwardRef render functions do not support propTypes or defaultProps. ' +
          'Did you accidentally pass a React component?',
      );
    }
  }

  return {
    $$typeof: REACT_FORWARD_REF_TYPE,
    render,  // 返回 reactnode代码
  };
}
