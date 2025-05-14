import {getOSAndName} from 'expensify-common/dist/Device';
import type {MutableRefObject, ReactElement} from 'react';
import React, {createContext, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {KeyboardEvents, useKeyboardHandler} from 'react-native-keyboard-controller';
import {useOnyx} from 'react-native-onyx';
import {runOnJS} from 'react-native-reanimated';
import useSafeAreaInsets from '@hooks/useSafeAreaInsets';
import changeKeyboardHeight from '@libs/actions/VirtualKeyboard';
import {isMobileSafari} from '@libs/Browser';
import getKeyboardHeight from '@libs/getKeyboardHeight';
import ONYXKEYS from '@src/ONYXKEYS';
import type ChildrenProps from '@src/types/utils/ChildrenProps';

type KeyboardStateContextValue = {
    /** Whether the keyboard is open */
    isKeyboardShown: boolean;

    /** Whether the keyboard is animating or shown */
    isKeyboardActive: boolean;

    /** Height of the keyboard in pixels */
    keyboardHeight: number;

    /** Ref to check if the keyboard is animating */
    isKeyboardAnimatingRef: MutableRefObject<boolean>;
};

const KeyboardStateContext = createContext<KeyboardStateContextValue>({
    isKeyboardShown: false,
    isKeyboardActive: false,
    keyboardHeight: 0,
    isKeyboardAnimatingRef: {current: false},
});

// TODO: Make this more accurate across iOS versions
function getIOSKeyboardHeightGuess(iosVersion: string | undefined): number {
    if (iosVersion?.startsWith('11')) {
        return 216;
    }

    return 200;
}

/**
 * Attempts to get or guess the initial virtual keyboard height.
 */
function getInitialKeyboardHeight() {
    // TODO: Implement initial keyboard height for environments other than Safari iOS
    if (isMobileSafari()) {
        const iosVersion = getOSAndName().osVersion;
        return getIOSKeyboardHeightGuess(iosVersion);
    }

    return 0;
}

function KeyboardStateProvider({children}: ChildrenProps): ReactElement | null {
    const {bottom} = useSafeAreaInsets();
    const [keyboardHeight] = useOnyx(ONYXKEYS.VIRTUAL_KEYBOARD_HEIGHT, {canBeMissing: true, initialValue: getInitialKeyboardHeight()});
    const isKeyboardAnimatingRef = useRef(false);
    const [isKeyboardActive, setIsKeyboardActive] = useState(false);

    useEffect(() => {
        // Polyfill for iOS Safari.
        // This is not entirely accurate, it guesses whether the keyboard is open
        // based on the visual viewport height.
        if (isMobileSafari()) {
            const keyboardChangeHandler = () => {
                if (visualViewport?.height === window.innerHeight) {
                    setIsKeyboardActive(false);
                } else {
                    setIsKeyboardActive(true);
                }
            };

            visualViewport?.addEventListener('resize', keyboardChangeHandler);

            return () => {
                visualViewport?.removeEventListener('resize', keyboardChangeHandler);
            };
        }

        const keyboardDidShowListener = KeyboardEvents.addListener('keyboardDidShow', (e) => {
            changeKeyboardHeight(getKeyboardHeight(e.height, bottom));
            setIsKeyboardActive(true);
        });
        const keyboardDidHideListener = KeyboardEvents.addListener('keyboardDidHide', () => {
            changeKeyboardHeight(0);
            setIsKeyboardActive(false);
        });
        const keyboardWillShowListener = KeyboardEvents.addListener('keyboardWillShow', () => {
            setIsKeyboardActive(true);
        });
        const keyboardWillHideListener = KeyboardEvents.addListener('keyboardWillHide', () => {
            setIsKeyboardActive(false);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, [bottom]);

    const setIsKeyboardAnimating = useCallback((isAnimating: boolean) => {
        isKeyboardAnimatingRef.current = isAnimating;
    }, []);

    useKeyboardHandler(
        {
            onStart: () => {
                'worklet';

                runOnJS(setIsKeyboardAnimating)(true);
            },
            onEnd: () => {
                'worklet';

                runOnJS(setIsKeyboardAnimating)(false);
            },
        },
        [],
    );

    const contextValue = useMemo(
        () => ({
            keyboardHeight: keyboardHeight ?? 0,
            isKeyboardShown: keyboardHeight !== 0,
            isKeyboardAnimatingRef,
            isKeyboardActive,
        }),
        [isKeyboardActive, keyboardHeight],
    );
    return <KeyboardStateContext.Provider value={contextValue}>{children}</KeyboardStateContext.Provider>;
}

export type {KeyboardStateContextValue};
export {KeyboardStateProvider, KeyboardStateContext};
