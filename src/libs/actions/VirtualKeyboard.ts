import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';

const changeKeyboardHeight = (height: number) => {
    Onyx.set(ONYXKEYS.VIRTUAL_KEYBOARD_HEIGHT, Math.max(height, 0));
};

export default changeKeyboardHeight;
